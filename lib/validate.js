// 数据校验：找出"看起来填错了"的地方，提醒店主确认。
// 这不是判断生意好坏，只是防止脏数据把分析带偏。
export function validateDishes(dishes) {
  const warnings = [];

  for (const d of dishes) {
    if (typeof d.salesChange === "number" && Math.abs(d.salesChange) > 3) {
      warnings.push(
        `「${d.name}」销量环比 ${Math.round(d.salesChange * 100)}%，变化过大，确认一下是不是填错了。`
      );
    }
    if (typeof d.weekUnits === "number" && d.weekUnits <= 0) {
      warnings.push(`「${d.name}」当前统计窗口的销量是 ${d.weekUnits}，正常应该大于 0。`);
    }
    if (typeof d.grossMargin === "number" && d.grossMargin < 0) {
      warnings.push(`「${d.name}」毛利率是负的，说明售价低于成本，确认一下。`);
    }
    if (typeof d.grossMargin === "number" && d.grossMargin > 0.95) {
      warnings.push(
        `「${d.name}」毛利率超过 95%，确认成本和售价是不是填反了。`
      );
    }
  }

  return warnings;
}
