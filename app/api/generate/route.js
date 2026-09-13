import { NextResponse } from "next/server";
import { demoData } from "@/lib/demoData";
import { runAllRules } from "@/lib/rules";
import { computeStats } from "@/lib/stats";
import { windowForGrain } from "@/lib/normalize";

// 建议的优先级：先处理下滑和亏钱，再看机会。
const PRIORITY = { R1: 1, R3: 2, R4: 3, R2: 4 };

// 后端接口：接收经营数据，跑规则，返回建议。
// 不传数据时，用服务端的示例数据（方便 demo 直接看效果）。
export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const data =
    Array.isArray(body?.data) && body.data.length ? body.data : demoData;

  // 分析口径跟着看板粒度走：日 / 周 / 月 / 季。
  const win = windowForGrain(body?.grain);

  const cards = runAllRules(data, { window: win }).sort(
    (a, b) => (PRIORITY[a.ruleId] ?? 99) - (PRIORITY[b.ruleId] ?? 99)
  );
  const stats = computeStats(data);

  console.log(
    `[api] POST /api/generate 口径 ${win.grain}（${win.period} vs ${win.prev}）收到 ${data.length} 条数据，生成 ${cards.length} 条建议`
  );

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    window: win,
    stats,
    cards,
  });
}
