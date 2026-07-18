// ============================================================
// services/grabParseService.test-data.js — แถวตัวอย่างจริง 3-5 แถวต่อชนิดไฟล์
// ใช้ทดสอบ parser ได้โดยไม่ต้องอัปไฟล์: detectAndParse(TXN_SAMPLE) ฯลฯ
// (ตัดคอลัมน์ท้าย ๆ ที่ไม่ใช้ออกไม่ได้ — Grab ส่งมาครบ จึงคงหัวตารางจริงทั้งแถว)
// ============================================================

export const TXN_SAMPLE = `ชื่อร้าน,Merchant ID,ชื่อร้าน,รหัสร้านค้า,Updated On,วันที่สร้าง,ประเภท,หมวดหมู่,รายการย่อย,สถานะ,Transaction ID,รหัสรายการที่เกี่ยวข้อง,รหัสการทำรายการพาร์ทเนอร์ 1,รหัสการทำรายการพาร์ทเนอร์ 2,รหัสคำสั่งซื้อยาว,รหัสคำสั่งซื้อสั้น,รหัสการจอง,ช่องทางการสั่งซื้อ,ประเภทคำสั่งซื้อ,วิธีการชำระเงิน,บัญชีรับเงิน / แหล่งที่มาของเงิน,เลขเครื่องทำรายการ,ช่องทาง,ประเภทโปรโมชัน,ค่าธรรมเนียม Grab (%),ตัวคูณคะแนน,คะแนนที่ได้รับ,รหัสการทำรายการ,วันที่โอน,ยอด,ภาษีคำสั่งซื้อ,ค่าบรรจุภัณฑ์ร้าน,ค่าธรรมเนียมสำหรับผู้ที่ไม่ได้เป็นสมาชิก,ค่าบริการของร้าน,โปรโมชัน,ส่วนลด (ออกโดยร้าน),ส่วนลดค่าจัดส่ง (ออกโดยร้าน),ค่าจัดส่งโดยร้าน (ร้านค้า Grab ออนไลน์),ค่าจัดส่งโดยร้าน (ร้านจัดส่งเอง),ค่าบริการจัดส่ง GrabExpress,ยอดขายสุทธิ,MDR สุทธิ,ภาษี MDR,ค่าธรรมเนียม Grab,ค่าธรรมเนียมการตลาด,ค่าคอมมิชชันการจัดส่ง,ค่าคอมมิชชันแพลตฟอร์ม,ค่าคอมมิชชันคำสั่งซื้อ,ค่าคอมมิชชันอื่นของ GrabFood / GrabMart,GrabKitchen Commission,ค่าคอมมิชชันอื่นของ GrabKitchen,ภาษีหัก ณ ที่จ่าย,ทั้งหมด,ภาษี MDR (%),ค่าคอมมิชชันการจัดส่ง (%),ค่าคอมมิชชันแพลตฟอร์ม (%),ค่าคอมมิชชันคำสั่งซื้อ (%),"ภาษีค่าคอมมิชชัน, การปรับรายได้, โฆษณา GrabFood / GrabMart",ภาษีค่าคอมมิชชัน GrabKitchen ทั้งหมด,สาเหตุที่ยกเลิก,ยกเลิกโดย,สาเหตุที่คืนเงิน,คำอธิบาย,กลุ่มเหตุการณ์,นามแฝงเหตุการณ์,รายการที่ได้รับผลกระทบ,ลิงค์อุทธรณ์,สถานะการอุทธรณ์
ร้านทดสอบ,mid-1,กะเพราโคตรคลีน - พระราม9,sid-1,17 Jul 2026 5:40 PM,17 Jul 2026 5:15 PM,GrabFood,ชำระเงิน,,เสร็จสมบูรณ์,,txn-a,,,ord-1,GF-267,bk-1,GrabFood app & web,Auto-Paid,ไม่ใช้เงินสด,,,,,,,,,,255,0,0,,,,-42,0,,0,0,213,,,,0,0,0,,0,0,0,0,213,,,,,0,0,,,,GOVERNMENT_WALLET,,,,,
ร้านทดสอบ,mid-1,กะเพราโคตรคลีน - พระราม9,sid-1,17 Jul 2026 5:40 PM,17 Jul 2026 5:40 PM,GrabFood,การปรับรายได้,Commission for Govt Campaign (taxable),เสร็จสมบูรณ์,txn-b,,,,ord-1,GF-267,bk-1,,Manually Paid,ไม่ใช้เงินสด,,,,,,,,,,-11.39,,,,,,,,,,,,,,,,,,,,,,,-11.39,,,,,,,,,,ค่าคอมมิชชันไทยช่วยไทยพลัส,,,,,
ร้านทดสอบ,mid-1,กะเพราโคตรคลีน - พระราม9,sid-1,17 Jul 2026 1:15 PM,17 Jul 2026 12:47 PM,GrabFood,ชำระเงิน,,เสร็จสมบูรณ์,txn-c,,,,ord-2,GF-021,bk-2,GrabFood app & web,Auto-Paid,เงินสด,,,,,,,,,,243,0,0,,,,0,0,,0,0,243,,,,0,0,-78,,-6.5,0,0,0,158.5,,,,,-5.53,0,,,,,,,,,`;

export const MENU_SAMPLE = `Date,Country,City,Merchant,Grab Service,Item,Units Sold,Item Gross Sales (฿)
16/07/2026,Thailand,Bangkok,กะเพราโคตรคลีน - พระราม9,GrabFood,[L-Jumbo จุกๆ] ข้าวไรซ์ฯกะเพราแซลมอน+อกไก่|ข้าว250/เนื้อ200|Max Protein,2,532
16/07/2026,Thailand,Bangkok,กะเพราโคตรคลีน - พระราม9,GrabFood,[Mini-คุมแคล] ข้าวไรซ์ฯกะเพราอกไก่ | 301kcal  |  Clean Food,9,1037
15/07/2026,Thailand,Bangkok,กะเพราโคตรคลีน - พระราม9,GrabFood,[Mini-คุมแคล] ข้าวหอมมะลิกะเพราเนื้อลีน | 365kcal | High Protein,2,405`;

export const TRANSFER_SAMPLE = `วันที่,ชื่อร้าน,รหัสร้านค้า,รหัสการจ่ายรายได้,ยอดสุทธิ,สถานะ,วันที่โอน,รหัสใบแจ้งยอดธนาคาร,ชื่อธนาคาร,ชื่อบัญชี
17 Jul 2026 2:04 AM,กะเพราโคตรคลีน - พระราม9,sid-1,STHVXWOHUN6V,1166.86,Completed,17 Jul 2026 3:13 AM,110370317653,Krungthai Bank PCL,2193
16 Jul 2026 2:05 AM,กะเพราโคตรคลีน - พระราม9,sid-1,STH50QUBDF3I,934.86,Completed,16 Jul 2026 3:13 AM,110370317653,Krungthai Bank PCL,2193
15 Jul 2026 2:02 AM,กะเพราโคตรคลีน - พระราม9,sid-1,STHKPNRGW5Y5,945.6,Failed,15 Jul 2026 3:25 AM,110370317653,Krungthai Bank PCL,2193`;

export const ADS_SAMPLE = `Advertiser Budget,Currency,Advertiser Name,Daily,Monthly,Yearly,AddToCart_,Ad Spend,Billable Ad Spend,Billable Local Ad Spend,CheckoutRate_,Clicks,Ad Generated Orders,Conversion(3P),Ad Generated Sales,Cost Per Order,eCPC,eCPCV,eCPV,CTR,CNV/1000,Delivery Percentage,eCPM,Impressions,Local Ad Spend,MenuVisit_,ProductQuantity_,ROAS,UniqueUserAddToCart_,UniqueUserMenuVisit_,Unique Clicks Reach,Unique Conversions Reach,Unique Impressions Reach,VCR,Video Completes,Video Detail Clicks,Video Expands,Video First Quartile,Video FullScreens,Video Midpoint,Video Mutes,Video Pauses,Video Resumes,Video Starts,Video Third Quartile,Video UnMutes,VTR
THB 0.00,THB,MEX_SS_TH,17,4,2026,1,USD 0.85,USD 0.85,THB 27.44,5.88 %,10,1,0,THB 180.00,27.44,THB 2.74,THB 0.00,THB 0.00,7.09 %,7.09,27.44 %,THB 194.61,141,THB 27.44,17,0,6.56,1,11,9,1,112,0.00 %,0,0,0,0,0,0,0,0,0,0,0,0,0.00 %
THB 0.00,THB,MEX_SS_TH,18,4,2026,12,USD 1.60,USD 1.60,THB 51.64,8.70 %,17,2,0,THB 586.00,25.82,THB 3.04,THB 0.00,THB 0.00,9.39 %,11.05,51.64 %,THB 285.30,181,THB 51.63,23,0,11.35,7,18,15,2,141,0.00 %,0,0,0,0,0,0,0,0,0,0,0,0,0.00 %`;
