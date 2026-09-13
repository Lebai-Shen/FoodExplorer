import { NextResponse } from "next/server";

// demo 用的内存存储，重启服务会清空。生产环境这里换成数据库。
const adopted = [];

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const adviceId = body?.adviceId;
  if (!adviceId) {
    return NextResponse.json(
      { ok: false, error: "缺少 adviceId" },
      { status: 400 }
    );
  }

  const record = { adviceId, at: new Date().toISOString() };
  adopted.push(record);
  console.log(`[api] POST /api/adopt ${adviceId}（累计 ${adopted.length} 条）`);

  return NextResponse.json({ ok: true, record, total: adopted.length });
}
