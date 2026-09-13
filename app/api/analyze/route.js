import { NextResponse } from "next/server";
import { demoData } from "@/lib/demoData";
import { runAllRules } from "@/lib/rules";
import { computeStats } from "@/lib/stats";
import { validateDishes } from "@/lib/validate";
import { windowForGrain } from "@/lib/normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

// AI 初步分析：把数据和规则发现交给大模型，让它用店主看得懂的话讲一遍，
// 并指出来源可疑的数据。
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
  const dishes = data.filter((d) => d.type === "dish");
  const cards = runAllRules(data, { window: win });
  const stats = computeStats(data);
  const warnings = validateDishes(data);

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "没有配置 DEEPSEEK_API_KEY。请在项目根目录的 .env.local 里加一行 DEEPSEEK_API_KEY=你的key，然后重启服务。",
      },
      { status: 500 }
    );
  }

  const compact = dishes.map((d) => ({
    菜品: d.name,
    [`${win.period}销量`]: d.weekUnits ?? null,
    [`${win.prev}销量`]: d.prevWeekUnits ?? null,
    环比:
      typeof d.salesChange === "number"
        ? Math.round(d.salesChange * 100) / 100
        : null,
    毛利率:
      typeof d.grossMargin === "number"
        ? Math.round(d.grossMargin * 100) / 100
        : null,
    库存: d.inventory ? `${d.inventory.quantity}${d.inventory.unit}` : null,
    剩余保质天数: d.inventory?.daysToExpiry ?? null,
  }));

  const findings = cards.map((c) => `${c.ruleId} ${c.conclusion}`);

  const userPrompt = [
    `这是一家餐饮小店${win.period}的经营数据（每条是一道菜，含${win.period}与${win.prev}的销量、毛利率、库存）：`,
    JSON.stringify(compact, null, 0),
    "",
    "系统规则引擎的发现（供参考，不要只是复述它）：",
    findings.length ? findings.join("\n") : "（没有触发规则）",
    "",
    "整体数字：",
    `${win.period}营业额约 ${Math.round(stats.weeklyRevenue)} 元，销量 ${stats.totalUnits} 份，整体毛利率约 ${Math.round(stats.weightedMargin * 100)}%。`,
    "",
    "数据校验提醒：",
    warnings.length ? warnings.join("\n") : "（没有明显异常）",
    "",
    "请你自己从数据里找发现，按下面四点输出。中文，说人话，每条不超过两句：",
    `1. 用一句话说${win.period}生意怎么样，最关键的一个信号是什么。`,
    "2. 你发现的 2 到 3 个值得注意的点。每个点写清：哪道菜、什么情况、判断依据（带上具体数字）、建议怎么做。不要只重复系统规则；如果你看到规则没提到的规律（比如某类菜都在涨、生意太依赖某一两款、库存和销量对不上、毛利结构有问题），也要说出来。",
    "3. 数据里有没有看起来不对、需要店主确认的地方。",
    "4. 如果这段窗口只能做一件事，先做哪件，为什么。",
    "只依据上面的数据，不要编造没有出现的数字。",
  ].join("\n");

  let resp;
  try {
    resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "你是给餐饮小店老板做经营分析的助手。只根据用户给的数据说话，不要编造。用店主看得懂的话，避免专业术语。",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "连不上模型接口：" + (e?.message || "网络错误") },
      { status: 502 }
    );
  }

  if (!resp.ok) {
    const detail = await resp.text();
    return NextResponse.json(
      {
        ok: false,
        error: `模型接口返回 ${resp.status}`,
        detail: detail.slice(0, 300),
      },
      { status: 502 }
    );
  }

  const json = await resp.json();
  const analysis = json?.choices?.[0]?.message?.content || "";

  console.log(
    `[api] POST /api/analyze 分析 ${dishes.length} 道菜，校验提醒 ${warnings.length} 条`
  );

  return NextResponse.json({
    ok: true,
    analysis,
    window: win,
    warnings,
    stats,
    cardCount: cards.length,
  });
}
