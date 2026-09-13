// 浏览器本地数据仓（demo 用）。生产环境应换成后端数据库。
// 存三块：明细记录（按日期）、上传日志、建议状态。
import { recordKey, DEFAULT_GRAIN, GRAIN_META } from "./normalize.js";

const RECORDS_KEY = "fe_records";
const LOG_KEY = "fe_upload_log";
const STATE_KEY = "fe_advice_state";
const GRAIN_KEY = "fe_grain";

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const s = window.localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, val) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(val));
}

// ---------- 明细记录 ----------

export function loadRecords() {
  return read(RECORDS_KEY, []);
}

// 找出这次上传里"已经存在"的记录（同日期同菜）。
export function findConflicts(incoming) {
  const cur = new Set(loadRecords().map(recordKey));
  return incoming.filter((r) => cur.has(recordKey(r))).map(recordKey);
}

// 入库：同日期同菜覆盖，不是叠加。
export function mergeRecords(incoming) {
  const map = new Map(loadRecords().map((r) => [recordKey(r), r]));
  let added = 0;
  let updated = 0;
  for (const r of incoming) {
    const k = recordKey(r);
    if (map.has(k)) updated += 1;
    else added += 1;
    map.set(k, r);
  }
  const merged = [...map.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name)
  );
  write(RECORDS_KEY, merged);
  return { records: merged, added, updated };
}

export function clearRecords() {
  write(RECORDS_KEY, []);
}

// 删除某段日期的数据。
export function deleteRange(from, to) {
  const left = loadRecords().filter((r) => r.date < from || r.date > to);
  write(RECORDS_KEY, left);
  return left;
}

// ---------- 上传日志 ----------

export function loadUploadLog() {
  return read(LOG_KEY, []);
}

export function appendUploadLog(entry) {
  const list = loadUploadLog();
  list.push({ id: `u-${Date.now()}`, at: new Date().toISOString(), ...entry });
  write(LOG_KEY, list);
  return list;
}

export function clearUploadLog() {
  write(LOG_KEY, []);
}

// ---------- 建议状态 ----------
// status: todo（默认，不落库） | accepted（进行中） | verified（已验证） | dismissed（忽略）

export function loadAdviceState() {
  return read(STATE_KEY, {});
}

export function setAdviceState(id, patch) {
  const all = loadAdviceState();
  all[id] = { ...(all[id] || {}), ...patch };
  write(STATE_KEY, all);
  return all[id];
}

// 某道菜在给定数据集里的销量与毛利率，用于采纳时的基线。
export function dishSnapshot(rows, dishName) {
  if (!rows || !dishName) return null;
  const d = rows.find((x) => x.name === dishName);
  if (!d) return null;
  return {
    weekUnits: typeof d.weekUnits === "number" ? d.weekUnits : null,
    grossMargin: typeof d.grossMargin === "number" ? d.grossMargin : null,
  };
}

// ---------- 分析口径 ----------
// 看板上选的粒度（日 / 周 / 月 / 季）记在本地，其它页面共用同一个口径。

export function loadGrain() {
  const g = read(GRAIN_KEY, DEFAULT_GRAIN);
  return GRAIN_META[g] ? g : DEFAULT_GRAIN;
}

export function saveGrain(grain) {
  write(GRAIN_KEY, GRAIN_META[grain] ? grain : DEFAULT_GRAIN);
  return loadGrain();
}
