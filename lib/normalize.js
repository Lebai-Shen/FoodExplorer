// 数据规范层：把表格行整理成"按日期"的明细记录，再按需汇总成分析用数据。
// 纯函数，前端后端都能用，不依赖解析库。

export const TEMPLATE_COLUMNS = [
  "日期",
  "菜品名",
  "销量",
  "售价",
  "成本",
  "库存量",
  "单位",
  "剩余保质天数",
];

const COL = {
  date: ["日期", "date", "day", "时间"],
  name: ["菜品名", "名称", "商品名", "菜名", "name", "dish"],
  units: ["销量", "本周销量", "卖出", "units", "sales"],
  price: ["售价", "单价", "price"],
  cost: ["成本", "cost"],
  qty: ["库存量", "库存", "stock", "quantity"],
  unit: ["单位", "unit"],
  expiry: ["剩余保质天数", "剩余天数", "保质期", "daysToExpiry", "expiry"],
};

const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  const lower = {};
  for (const k of Object.keys(row)) lower[String(k).toLowerCase().trim()] = row[k];
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// 支持：Excel 日期对象、2026-06-15、2026/6/15、2026-06（按当月 1 号）。
export function toDateStr(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return fmt(v);
  if (typeof v === "number" && v > 20000) {
    const d = new Date(1899, 11, 30 + Math.round(v));
    if (!Number.isNaN(d.getTime())) return fmt(d);
  }
  const s = String(v ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${pad(m[2])}-01`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return fmt(d);
  return null;
}

function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return fmt(dt);
}

// 表格行 → 明细记录（一行 = 某道菜某天的数据）。
export function rowsToRecords(rows) {
  const records = [];
  const issues = [];

  rows.forEach((row, i) => {
    const rawDate = pick(row, COL.date);
    const date = toDateStr(rawDate);
    const name = pick(row, COL.name);
    if (!name) return;

    if (!date) {
      issues.push(`第 ${i + 2} 行「${name}」缺少日期或日期格式不对，已跳过。`);
      return;
    }

    const units = num(pick(row, COL.units));
    const price = num(pick(row, COL.price));
    const cost = num(pick(row, COL.cost));
    const qty = num(pick(row, COL.qty));
    const unit = pick(row, COL.unit) || "份";
    const expiry = num(pick(row, COL.expiry));

    records.push({
      date,
      name: String(name).trim(),
      units,
      price,
      cost,
      qty,
      unit,
      expiry,
    });
  });

  if (!records.length) {
    const headers = rows[0]
      ? Object.keys(rows[0])
          .map((h) => String(h).replace(/^\uFEFF/, ""))
          .join("、")
      : "（读不到表头）";
    issues.push(
      `没有读到有效数据。我们读到的表头是：${headers}。期望的表头是：${TEMPLATE_COLUMNS.join("、")}。`
    );
  }

  return { records, issues };
}

export function recordKey(r) {
  return `${r.date}|${r.name}`;
}

// 按粒度算周期键。
export function periodKey(dateStr, grain) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (grain === "month") return `${y}-${pad(m)}`;
  if (grain === "quarter") return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
  if (grain === "week") {
    const dt = new Date(Date.UTC(y, m - 1, d));
    const dow = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - dow);
    const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((dt - yearStart) / 86400000 + 1) / 7);
    return `${dt.getUTCFullYear()}-W${pad(week)}`;
  }
  return dateStr; // day
}

// 按粒度汇总：每个周期一条，含营业额和销量。
export function aggregate(records, grain = "week") {
  const map = new Map();
  for (const r of records) {
    const key = periodKey(r.date, grain);
    const cur = map.get(key) || { key, revenue: 0, units: 0 };
    cur.units += r.units || 0;
    cur.revenue += (r.units || 0) * (r.price || 0);
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function dateRange(records) {
  if (!records.length) return null;
  const dates = records.map((r) => r.date).sort();
  return { from: dates[0], to: dates[dates.length - 1] };
}

// 分析口径：看板选中的粒度，决定拿多长的两段窗口做对比。
// 日 = 最近 1 天 vs 前一天；周 = 最近 7 天 vs 前 7 天；月 / 季依次放大。
export const GRAIN_META = {
  day: { grain: "day", days: 1, label: "日", period: "最近 1 天", prev: "前一天", next: "明天" },
  week: { grain: "week", days: 7, label: "周", period: "最近 7 天", prev: "前 7 天", next: "下周" },
  month: {
    grain: "month",
    days: 30,
    label: "月",
    period: "最近 30 天",
    prev: "前 30 天",
    next: "下个月",
  },
  quarter: {
    grain: "quarter",
    days: 90,
    label: "季",
    period: "最近 90 天",
    prev: "前 90 天",
    next: "下个季度",
  },
};

// 默认按周看：这是产品的主推口径。
export const DEFAULT_GRAIN = "week";

// 粒度 → 分析口径。认不出来的粒度一律按周处理。
export function windowForGrain(grain) {
  return GRAIN_META[grain] || GRAIN_META[DEFAULT_GRAIN];
}

// 对比窗口的具体日期：以数据里最新的一天为终点，往前排两段等长的窗口。
export function windowRange(records, days = GRAIN_META[DEFAULT_GRAIN].days) {
  const range = dateRange(records);
  if (!range) return null;
  const end = range.to;
  const curStart = addDays(end, -(days - 1));
  const prevEnd = addDays(curStart, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  return { curStart, curEnd: end, prevStart, prevEnd };
}

// 明细记录 → 规则引擎要的数据：窗口内 vs 前一个等长窗口。
export function recordsToDataset(records, days = GRAIN_META[DEFAULT_GRAIN].days) {
  if (!records?.length) return [];
  const win = windowRange(records, days);
  if (!win) return [];
  const { curStart, curEnd: end, prevStart, prevEnd } = win;

  const byDish = new Map();
  for (const r of records) {
    const cur = byDish.get(r.name) || {
      name: r.name,
      cur: 0,
      prev: 0,
      latest: null,
    };
    if (r.date >= curStart && r.date <= end) cur.cur += r.units || 0;
    if (r.date >= prevStart && r.date <= prevEnd) cur.prev += r.units || 0;
    if (!cur.latest || r.date >= cur.latest.date) cur.latest = r;
    byDish.set(r.name, cur);
  }

  return [...byDish.values()].map((d) => {
    const latest = d.latest || {};
    const grossMargin =
      latest.price && latest.price > 0 && latest.cost !== null && latest.cost !== undefined
        ? (latest.price - latest.cost) / latest.price
        : null;
    const salesChange = d.prev > 0 ? (d.cur - d.prev) / d.prev : null;
    return {
      id: `agg-${d.name}`,
      name: d.name,
      type: "dish",
      weekUnits: d.cur,
      prevWeekUnits: d.prev,
      unitPrice: latest.price ?? null,
      cost: latest.cost ?? null,
      grossMargin,
      salesChange,
      dailySales: [],
      inventory:
        latest.qty !== null && latest.qty !== undefined
          ? {
              quantity: latest.qty,
              unit: latest.unit || "份",
              daysToExpiry: latest.expiry ?? 999,
            }
          : null,
      combos: [],
    };
  });
}
