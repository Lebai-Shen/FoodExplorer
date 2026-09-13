// 服务端统计逻辑：算出首页要展示的三个核心数字。
// 演示用假定单价（仅用于计算营业额与毛利率，非真实报价）。
export const PRICE = {
  经典拿铁: 28,
  冰美式: 22,
  焦糖玛奇朵: 30,
  提拉米苏: 32,
  牛角包: 15,
  燕麦拿铁: 26,
  抹茶拿铁: 24,
};

const weekUnits = (dish) => dish.dailySales.reduce((a, b) => a + b, 0);

// 上传的数据只有本周总量，示例数据是逐日销量，这里统一取"本周总量"。
const unitsOf = (dish) =>
  typeof dish.weekUnits === "number" ? dish.weekUnits : weekUnits(dish);

// 上传的数据带售价，示例数据用假定单价表。
const priceOf = (dish) =>
  typeof dish.unitPrice === "number" ? dish.unitPrice : PRICE[dish.name] || 0;

export function computeStats(data) {
  const dishes = data.filter((d) => d.type === "dish");
  const totalUnits = dishes.reduce((s, d) => s + unitsOf(d), 0);
  const weeklyRevenue = dishes.reduce((s, d) => s + unitsOf(d) * priceOf(d), 0);
  const weightedMargin = weeklyRevenue
    ? dishes.reduce(
        (s, d) => s + unitsOf(d) * priceOf(d) * (d.grossMargin || 0),
        0
      ) / weeklyRevenue
    : 0;
  const weightedChange = totalUnits
    ? dishes.reduce((s, d) => s + unitsOf(d) * (d.salesChange || 0), 0) /
      totalUnits
    : 0;
  return { weeklyRevenue, totalUnits, weightedMargin, weightedChange };
}
