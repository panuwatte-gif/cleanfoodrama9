// ============================================================
// services/financeService.js — income & expense records.
// income: per-channel gross/fees/net. expense: category/amount/note.
// (Goods-receiving COST is owner-only and tracked via receipts, NOT here.)
// ------------------------------------------------------------
// listIncome({from?,to?})   → Promise<income[]>
// addIncome(rec, by)        → Promise<income>   (logs)
// listExpense({from?,to?})  → Promise<expense[]>
// addExpense(rec, by)       → Promise<expense>  (logs)
// summary({from,to})        → Promise<{gross,net,expense,profit}>  (stub)
// wires: api/apiClient, services/editLogService
// ============================================================

import * as api from "../api/apiClient.js";
import { logEdit } from "./editLogService.js";
import { nowISO } from "../utils/id.js";

export async function listIncome() { return api.select("incomeRecords"); }
export async function listExpense() { return api.select("expenseRecords"); }

export async function addIncome(rec, by) {
  // STUB: real round computes netAmount = gross - gpFee - marketingFee.
  const created = await api.insert("incomeRecords", { date: nowISO(), ...rec });
  await logEdit({ targetTable: "incomeRecords", targetId: created.id, before: null, after: created, editedBy: by });
  return created;
}

export async function addExpense(rec, by) {
  const created = await api.insert("expenseRecords", { date: nowISO(), ...rec });
  await logEdit({ targetTable: "expenseRecords", targetId: created.id, before: null, after: created, editedBy: by });
  return created;
}

export async function summary() {
  // STUB: real round aggregates income/expense over a date range.
  return { gross: 0, net: 0, expense: 0, profit: 0 };
}
