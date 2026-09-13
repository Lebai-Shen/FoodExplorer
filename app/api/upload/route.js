import { NextResponse } from "next/server";
import { parseWorkbook, rowsToRecords, TEMPLATE_CSV } from "@/lib/uploadParse";
import { recordsToDataset, dateRange } from "@/lib/normalize";
import { validateDishes } from "@/lib/validate";

export const runtime = "nodejs";

// 上传文件：接收 Excel 或 CSV，解析成按日期的明细记录。
export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "没收到上传内容" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "没有收到文件" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rows;
  try {
    rows = parseWorkbook(buffer);
  } catch {
    return NextResponse.json(
      { ok: false, error: "解析失败。请确认文件是 .xlsx 或 .csv，且第一个工作表是数据。" },
      { status: 400 }
    );
  }

  const { records, issues } = rowsToRecords(rows);
  const dataset = recordsToDataset(records);
  const warnings = validateDishes(dataset);
  const range = dateRange(records);

  console.log(
    `[api] POST /api/upload 解析「${file.name}」，读到 ${rows.length} 行，得到 ${records.length} 条明细，提醒 ${warnings.length} 条`
  );

  return NextResponse.json({
    ok: true,
    file: file.name,
    rowCount: rows.length,
    records,
    issues,
    warnings,
    range,
  });
}

// 下载模板。
export async function GET() {
  return new NextResponse(TEMPLATE_CSV, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="foodexplorer-template.csv"',
    },
  });
}
