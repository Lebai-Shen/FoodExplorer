import { GRAIN_META } from "./normalize";

// rules.js
// 规则引擎：根据一个对比窗口（默认近 7 天，跟着看板的日 / 周 / 月 / 季走）的经营数据，生成经营建议卡片。
// 每张卡片包含：结论(conclusion)、依据(evidence)、风险(risk)、预期效果(expectedEffect)。

export const THRESHOLDS = {
  salesDrop: -0.3, // 对比窗口内销量环比下滑超过 30%
  comboRate: 0.4, // 两菜组合购买率超过 40%
  lowMargin: 0.3, // 毛利率低于 30%
  expiryDays: 2, // 剩余保质期 <= 2 天视为临近到期
  largeQty: 15, // 库存量 >= 15 视为量大
};

function makeCard(ruleId, target, conclusion, evidence, risk, expectedEffect) {
  return {
    id: `${ruleId}-${target}`,
    ruleId,
    target,
    conclusion,
    evidence,
    risk,
    expectedEffect,
  };
}

const pct = (x) => Math.round(x * 100);

const sumDaily = (d) => (d.dailySales || []).reduce((a, b) => a + b, 0);

// 上传的数据只有本周/上周总量，示例数据是逐日销量，这里统一取"本周总量"。
const unitsOf = (d) => (typeof d.weekUnits === "number" ? d.weekUnits : sumDaily(d));

/**
 * 运行全部规则，返回建议卡片数组。
 * @param {Array} data demoData 数组
 * @returns {Array<{ruleId, target, conclusion, evidence, risk, expectedEffect}>}
 */
export function runAllRules(data, options = {}) {
  // 分析口径：由调用方按当前粒度传入，不传就是按周。
  const w = options.window || GRAIN_META.week;
  const cards = [];
  const dishes = data.filter((d) => d.type === "dish");

  // R1：窗口内销量环比下滑 > 30% -> 下个周期减半备货 / 考虑下架
  for (const d of dishes) {
    if (typeof d.salesChange === "number" && d.salesChange <= THRESHOLDS.salesDrop) {
      const units = unitsOf(d);
      const prev =
        typeof d.prevWeekUnits === "number"
          ? d.prevWeekUnits
          : d.salesChange > -1
            ? Math.round(units / (1 + d.salesChange))
            : null;
      const detail =
        (d.dailySales || []).length >= 2
          ? `日销量从 ${d.dailySales[0]} 份/天降到 ${d.dailySales[d.dailySales.length - 1]} 份/天`
          : prev !== null
            ? `销量从${w.prev}约 ${prev} 份降到${w.period} ${units} 份`
            : "销量持续走弱";
      cards.push(
        makeCard(
          "R1",
          d.name,
          `「${d.name}」${w.period}销量下滑 ${pct(Math.abs(d.salesChange))}%，建议${w.next}减半备货，视情况考虑下架。`,
          `${w.period}销量环比 ${pct(d.salesChange)}%，${detail}，走弱明显。`,
          "下滑可能是短期波动（天气、节假日、周边活动）引起的，直接减备货或下架可能错过回升；建议先观察是否连续多周下滑，再决定是否下架。",
          "减少积压和浪费，把备货与排产压到实际需求附近；若持续下滑，可及时止损，避免库存损失。"
        )
      );
    }
  }

  // R2：两菜组合购买率 > 40% -> 打包成套餐
  const seenPairs = new Set();
  for (const d of dishes) {
    for (const c of d.combos || []) {
      if (c.rate > THRESHOLDS.comboRate) {
        const key = [d.name, c.with].slice().sort().join("+");
        if (seenPairs.has(key)) {
          continue;
        }
        seenPairs.add(key);
        cards.push(
          makeCard(
            "R2",
            `${d.name} + ${c.with}`,
            `「${d.name} + ${c.with}」组合点单率 ${pct(c.rate)}%，建议打包成套餐。`,
            `两菜同时下单的比例为 ${pct(c.rate)}%，高于 40% 阈值，属于高频搭配。`,
            "套餐若让利过多会压毛利；若其中一款成本正在上涨（如奶价），套餐毛利需要重新核算。",
            "提高客单价和连带率，减少顾客的决策成本。"
          )
        );
      }
    }
  }

  // R3：毛利率 < 30% 且销量下跌 -> 调价或换供应商
  for (const d of dishes) {
    if (
      typeof d.grossMargin === "number" &&
      d.grossMargin < THRESHOLDS.lowMargin &&
      typeof d.salesChange === "number" &&
      d.salesChange < 0
    ) {
      cards.push(
        makeCard(
          "R3",
          d.name,
          `「${d.name}」毛利率仅 ${pct(d.grossMargin)}%，且销量在下滑，建议调价或更换供应商。`,
          `毛利率 ${pct(d.grossMargin)}%（低于 30%），${w.period}销量环比 ${pct(d.salesChange)}%。`,
          "直接提价可能加速下滑；需先判断是成本上升还是需求下降，再决定是调价、换供应商，还是精简该单品。",
          "改善单品毛利；若换供应商或适当提价，毛利率有望回到 30% 以上。"
        )
      );
    }
  }

  // R4：库存临近到期且量大 -> 今日特价消耗库存
  for (const d of data) {
    const inv = d.inventory;
    if (
      inv &&
      inv.daysToExpiry <= THRESHOLDS.expiryDays &&
      inv.quantity >= THRESHOLDS.largeQty
    ) {
      cards.push(
        makeCard(
          "R4",
          d.name,
          `「${d.name}」库存 ${inv.quantity}${inv.unit}，只剩 ${inv.daysToExpiry} 天到期，建议今日特价消耗库存。`,
          `剩余保质期 ${inv.daysToExpiry} 天，库存量 ${inv.quantity}${inv.unit}，存在过期报废风险。`,
          "特价会拉低当日毛利，也可能影响价格感；建议限定今日、限量，并优先搭配关联菜品一起推。",
          "减少浪费与报废损失，回收部分成本，同时引流带动关联商品。"
        )
      );
    }
  }

  return cards;
}
