// ============================================================
// services/grabParseService.js — parser ไฟล์ CSV จาก Grab (deterministic ล้วน)
// auto-detect ชนิดไฟล์จาก "ชื่อคอลัมน์" (ไม่ใช่ชื่อไฟล์) · อ่านค่าด้วยชื่อคอลัมน์เท่านั้น
// คอลัมน์สำคัญหาย → throw Error ภาษาไทยบอกวิธีแก้
// หนึ่งชนิดไฟล์ = หนึ่งฟังก์ชัน: parseTransactionCSV / parseMenuSalesCSV / parseTransfersCSV / parseAdsCSV
// ============================================================

/* ---------- ตัวช่วยกลาง ---------- */
// แปลง CSV → array of rows (รองรับค่าในเครื่องหมายคำพูด เช่น "THB 1,027.00")
export function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); cur = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
    else if (c !== "\r") cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
// วันที่แบบอังกฤษของ Grab: "17 Jul 2026 5:40 PM" → { iso:"2026-07-17", hour:17 }
export function parseGrabDate(s) {
  const m = String(s || "").trim().match(/^(\d{1,2}) (\w{3}) (\d{4})(?: (\d{1,2}):(\d{2}) (AM|PM))?$/);
  if (!m || !MON[m[2]]) return null;
  let hh = m[4] ? parseInt(m[4], 10) : 0;
  if (m[6] === "PM" && hh < 12) hh += 12;
  if (m[6] === "AM" && hh === 12) hh = 0;
  return { iso: m[3] + "-" + String(MON[m[2]]).padStart(2, "0") + "-" + m[1].padStart(2, "0"), hour: hh };
}
// ตัวเลขเงินของ Grab อาจเป็น "THB 1,027.00" / "153.59 %" → strip ก่อน parse
export function grabNum(s) { if (s == null || s === "") return 0; const v = parseFloat(String(s).replace(/THB|USD|,|%|\s/g, "")); return isNaN(v) ? 0 : v; }
const r2 = (v) => Math.round(v * 100) / 100;

// สร้าง map ชื่อคอลัมน์ → index (ชื่อซ้ำใช้ตัวแรก) + ตรวจคอลัมน์สำคัญ
function headerIndex(header, required, fileLabel, menuHint) {
  const idx = {}; header.forEach((c, i) => { const k = c.trim(); if (!(k in idx)) idx[k] = i; });
  const missing = required.filter((c) => !(c in idx));
  if (missing.length) throw new Error("ไฟล์นี้ขาดคอลัมน์ " + missing.join(", ") + " — น่าจะ export ผิดประเภท ให้ไปที่เมนู " + menuHint + " ใน Grab Merchant แล้วดาวน์โหลดใหม่");
  return idx;
}

/* ---------- C1: TRANSACTION ---------- */
export function parseTransactionCSV(rows) {
  const idx = headerIndex(rows[0], ["วันที่สร้าง", "หมวดหมู่", "ยอดขายสุทธิ", "ทั้งหมด"], "transaction", "รายงาน > ธุรกรรม (Transaction)");
  const txnDaily = {}, feeMonthly = {}; let nRows = 0, minD = null, maxD = null;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]; if (r.length < 5) continue;
    const d = parseGrabDate(r[idx["วันที่สร้าง"]]); if (!d) continue;
    nRows++;
    if (!minD || d.iso < minD) minD = d.iso;
    if (!maxD || d.iso > maxD) maxD = d.iso;
    const cat = (r[idx["หมวดหมู่"]] || "").trim();
    const total = grabNum(r[idx["ทั้งหมด"]]);
    if (cat === "ชำระเงิน") {
      const t = txnDaily[d.iso] || (txnDaily[d.iso] = { o: 0, ns: 0, po: 0, hr: {} });
      t.o++; t.ns = r2(t.ns + grabNum(r[idx["ยอดขายสุทธิ"]])); t.po = r2(t.po + total);
      t.hr[d.hour] = (t.hr[d.hour] || 0) + 1;
    } else if (cat) {
      // แถวหัก (โฆษณา/การตลาด/การปรับรายได้) เก็บรวมเป็นรายเดือนตามหมวด
      const fm = feeMonthly[d.iso.slice(0, 7)] || (feeMonthly[d.iso.slice(0, 7)] = {});
      fm[cat] = r2((fm[cat] || 0) + total);
    }
  }
  if (!nRows) throw new Error("ไฟล์ transaction ไม่มีแถวข้อมูลที่อ่านได้ — ตรวจว่าดาวน์โหลดครบไฟล์");
  return { type: "txn", label: "ธุรกรรม/ออเดอร์", period: [minD, maxD], days: Object.keys(txnDaily).length, rows: nRows, txnDaily, feeMonthly };
}

/* ---------- C2: MENU SALES ---------- */
export function parseMenuSalesCSV(rows) {
  const idx = headerIndex(rows[0], ["Date", "Item", "Units Sold", "Item Gross Sales (฿)"], "menu sales", "Insights > Menu Sales");
  const menuByDate = {}; let nRows = 0, minD = null, maxD = null;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]; if (r.length < 4) continue;
    const m = String(r[idx["Date"]] || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) continue;
    const iso = m[3] + "-" + m[2] + "-" + m[1];
    nRows++;
    if (!minD || iso < minD) minD = iso;
    if (!maxD || iso > maxD) maxD = iso;
    (menuByDate[iso] || (menuByDate[iso] = [])).push([r[idx["Item"]], grabNum(r[idx["Units Sold"]]), grabNum(r[idx["Item Gross Sales (฿)"]])]);
  }
  if (!nRows) throw new Error("ไฟล์ menu sales ไม่มีแถวข้อมูลที่อ่านได้ — ตรวจว่าดาวน์โหลดครบไฟล์");
  return { type: "menu", label: "ยอดขายรายเมนู", period: [minD, maxD], days: Object.keys(menuByDate).length, rows: nRows, menuByDate };
}

/* ---------- C3: TRANSFERS ---------- */
export function parseTransfersCSV(rows) {
  const idx = headerIndex(rows[0], ["รหัสการจ่ายรายได้", "ยอดสุทธิ", "สถานะ", "วันที่โอน"], "transfers", "การเงิน > เงินโอนเข้าธนาคาร (Transfers)");
  const transfers = {}; let nRows = 0, skipped = 0, minD = null, maxD = null;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]; if (r.length < 4) continue;
    const pid = (r[idx["รหัสการจ่ายรายได้"]] || "").trim(); if (!pid) continue;
    nRows++;
    if (r[idx["สถานะ"]] !== "Completed") { skipped++; continue; } // นับเฉพาะโอนสำเร็จ
    const d = parseGrabDate(r[idx["วันที่โอน"]]); if (!d) { skipped++; continue; }
    if (!minD || d.iso < minD) minD = d.iso;
    if (!maxD || d.iso > maxD) maxD = d.iso;
    transfers[pid] = [d.iso, grabNum(r[idx["ยอดสุทธิ"]])];
  }
  if (!nRows) throw new Error("ไฟล์ transfers ไม่มีแถวข้อมูลที่อ่านได้ — ตรวจว่าดาวน์โหลดครบไฟล์");
  return { type: "transfer", label: "เงินโอนเข้าธนาคาร", period: [minD, maxD], days: Object.keys(transfers).length, rows: nRows, skipped, transfers };
}

/* ---------- C4: ADS ---------- */
export function parseAdsCSV(rows) {
  const idx = headerIndex(rows[0], ["Ad Spend", "Daily", "Monthly", "Yearly", "Local Ad Spend", "Ad Generated Orders", "Ad Generated Sales"], "ads", "Marketing > Ads Report");
  const hasCampaign = "Campaigns Name" in idx; // มี = ระดับแคมเปญ · ไม่มี = ระดับร้าน (ใช้ระดับร้านเป็นหลัก)
  const adsDaily = {}; let nRows = 0, minD = null, maxD = null;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]; if (r.length < 8) continue;
    const iso = r[idx["Yearly"]] + "-" + String(grabNum(r[idx["Monthly"]])).padStart(2, "0") + "-" + String(grabNum(r[idx["Daily"]])).padStart(2, "0");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    nRows++;
    if (!minD || iso < minD) minD = iso;
    if (!maxD || iso > maxD) maxD = iso;
    const rec = [r2(grabNum(r[idx["Local Ad Spend"]])), grabNum(r[idx["Ad Generated Orders"]]), grabNum(r[idx["Ad Generated Sales"]]), grabNum(r[idx["Impressions"]] || 0), grabNum(r[idx["Clicks"]] || 0)];
    if (hasCampaign && adsDaily[iso]) {
      // ไฟล์รายแคมเปญ: รวมทุกแคมเปญของวันเดียวกัน
      adsDaily[iso] = adsDaily[iso].map((v, k) => r2(v + rec[k]));
    } else adsDaily[iso] = rec;
  }
  if (!nRows) throw new Error("ไฟล์ ads ไม่มีแถวข้อมูลที่อ่านได้ — ตรวจว่าดาวน์โหลดครบไฟล์");
  return { type: "ads", label: "โฆษณา (Ads)" + (hasCampaign ? " · ระดับแคมเปญ" : " · ระดับร้าน"), period: [minD, maxD], days: Object.keys(adsDaily).length, rows: nRows, adsDaily };
}

/* ---------- C5: PEAK HOUR (ช่วงเวลาขายดี) ---------- */
// คอลัมน์ = Date + ชั่วโมง "01".."23","00" (จำนวนออเดอร์ต่อชั่วโมง)
export function parsePeakHourCSV(rows) {
  const idx = headerIndex(rows[0], ["Date", "01", "12", "23", "00"], "peak hour", "Insights > ช่วงเวลาขายดี (Peak Hour)");
  const peakDaily = {}; let nRows = 0, minD = null, maxD = null;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]; if (r.length < 10) continue;
    const m = String(r[idx["Date"]] || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) continue;
    const iso = m[3] + "-" + m[2] + "-" + m[1];
    nRows++;
    if (!minD || iso < minD) minD = iso;
    if (!maxD || iso > maxD) maxD = iso;
    const arr = new Array(24).fill(0);
    for (let hh = 0; hh < 24; hh++) { const col = hh === 0 ? "00" : String(hh).padStart(2, "0"); if (col in idx) arr[hh] = grabNum(r[idx[col]]); }
    peakDaily[iso] = arr;
  }
  if (!nRows) throw new Error("ไฟล์ peak hour ไม่มีแถวข้อมูลที่อ่านได้ — ตรวจว่าดาวน์โหลดครบไฟล์");
  return { type: "peak", label: "ช่วงเวลาขายดี (Peak Hour)", period: [minD, maxD], days: Object.keys(peakDaily).length, rows: nRows, peakDaily };
}

/* ---------- auto-detect จากชื่อคอลัมน์ (ข้อ C) ---------- */
export function detectAndParse(text) {
  const rows = parseCSV(text);
  if (!rows.length || rows[0].length < 3) throw new Error("อ่านไฟล์ไม่ได้ — ไม่ใช่ CSV หรือไฟล์ว่าง ให้ดาวน์โหลดจาก Grab Merchant ใหม่");
  const cols = {}; rows[0].forEach((c) => (cols[c.trim()] = 1));
  if (cols["วันที่สร้าง"] && cols["หมวดหมู่"] && cols["ยอดขายสุทธิ"]) return parseTransactionCSV(rows);
  if (cols["รหัสการจ่ายรายได้"]) return parseTransfersCSV(rows);
  if (cols["Item"] && cols["Units Sold"] && cols["Date"]) return parseMenuSalesCSV(rows);
  if (cols["Date"] && cols["01"] && cols["23"] && cols["00"]) return parsePeakHourCSV(rows);
  if (cols["Ad Spend"] && cols["Daily"] && cols["Monthly"] && cols["Yearly"]) return parseAdsCSV(rows);
  throw new Error("ไม่รู้จักชนิดไฟล์นี้ — ระบบรองรับ 5 ชนิด: Transaction · Menu Sales · Transfers · Ads · Peak Hour (ดูวิธีดาวน์โหลดในหน้าอัปโหลด)");
}
