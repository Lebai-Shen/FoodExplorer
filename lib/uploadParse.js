import * as XLSX from "xlsx";
import { rowsToRecords } from "./normalize.js";

export { rowsToRecords };
export { TEMPLATE_COLUMNS } from "./normalize.js";

const pad = (n) => String(n).padStart(2, "0");

function addDaysStr(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

// 模板：14 天（前 7 天 + 后 7 天）的明细，够算出周环比。
const TEMPLATE_END = "2026-06-14";
const TEMPLATE_DISHES = [
  { name: "经典拿铁", early: 45, late: 46, price: 28, cost: 7.8, qty: 200, unit: "杯", expiry: 14 },
  { name: "冰美式", early: 41, late: 43, price: 22, cost: 7.5, qty: 180, unit: "杯", expiry: 14 },
  { name: "焦糖玛奇朵", early: 17, late: 11, price: 30, cost: 9.6, qty: 30, unit: "杯", expiry: 10 },
  { name: "牛角包", early: 28, late: 24, price: 15, cost: 10.8, qty: 26, unit: "个", expiry: 1 },
];

function buildTemplateCsv() {
  const lines = ["\uFEFF" + "日期,菜品名,销量,售价,成本,库存量,单位,剩余保质天数"];
  for (let i = 13; i >= 0; i -= 1) {
    const date = addDaysStr(TEMPLATE_END, -i);
    const late = i <= 6;
    for (const d of TEMPLATE_DISHES) {
      const units = late ? d.late : d.early;
      lines.push(
        [date, d.name, units, d.price, d.cost, d.qty, d.unit, d.expiry].join(",")
      );
    }
  }
  return lines.join("\n") + "\n";
}

export const TEMPLATE_CSV = buildTemplateCsv();

// Excel 在中文 Windows 上另存 CSV 常用 GBK，单按 UTF-8 读会乱码。
function decodeText(buffer) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    try {
      text = new TextDecoder("gb18030").decode(buffer);
    } catch {
      text = buffer.toString("utf8");
    }
  }
  return text.replace(/^\uFEFF/, "");
}

// 把 xlsx / csv 的二进制读成一组行对象。
export function parseWorkbook(buffer) {
  const isZip =
    buffer.length > 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  const wb = isZip
    ? XLSX.read(buffer, { type: "buffer", cellDates: true })
    : XLSX.read(decodeText(buffer), { type: "string", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
}
