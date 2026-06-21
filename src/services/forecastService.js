// ============================================================
// services/forecastService.js — demand forecast. Output is a RANGE
// per item (low / expected / high), shown on the Forecast page.
// ⚠️ NO formula this round — stub only. The real model (moving
// average / seasonality / safety stock) lands in a later round.
// ------------------------------------------------------------
// getForecast({ horizonDays }) → Promise<{generatedAt, horizonDays, results:[
//                                 { itemId, name, unit, low, expected, high }]}>
// wires: api/apiClient (forecastResults, stockItems, stockCounts), config flag
// ============================================================

import { CONFIG } from "../config/config.js";

export async function getForecast({ horizonDays = 7 } = {}) {
  if (!CONFIG.FEATURE_FLAGS.enableForecast) {
    return { generatedAt: null, horizonDays, results: [] };
  }
  // STUB: returns an empty result set. Do NOT implement the formula here
  // this round. The page renders the empty-state until real numbers exist.
  // TODO(next round): pull historical counts/receipts, compute
  // low/expected/high per item, persist to forecastResults.
  return { generatedAt: null, horizonDays, results: [] };
}
