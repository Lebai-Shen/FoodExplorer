// demoData.js
// 一家咖啡店最近 7 天的经营模拟数据。
// 字段说明：
//   id / name / type('dish' 菜品 | 'ingredient' 原料)
//   dailySales: 7 天的每日销量数组
//   grossMargin: 毛利率（0-1）
//   salesChange: 近 7 天销量环比（正数增长，负数下滑；-0.30 即 -30%）
//   inventory: { quantity, unit, daysToExpiry } 库存量与剩余保质期（天）
//   combos: [{ with, rate }] 经常一起被点的组合及其占比（0-1）

export const demoData = [
  {
    id: "latte",
    name: "经典拿铁",
    type: "dish",
    dailySales: [42, 43, 44, 45, 46, 47, 48],
    grossMargin: 0.72,
    salesChange: 0.06,
    inventory: { quantity: 200, unit: "杯", daysToExpiry: 14 },
    combos: [
      { with: "牛角包", rate: 0.46 },
      { with: "提拉米苏", rate: 0.22 },
    ],
  },
  {
    id: "americano",
    name: "冰美式",
    type: "dish",
    dailySales: [38, 39, 40, 41, 42, 43, 44],
    grossMargin: 0.66,
    salesChange: 0.08,
    inventory: { quantity: 180, unit: "杯", daysToExpiry: 14 },
    combos: [
      { with: "提拉米苏", rate: 0.33 },
      { with: "贝果", rate: 0.24 },
    ],
  },
  {
    id: "caramel-macchiato",
    name: "焦糖玛奇朵",
    type: "dish",
    dailySales: [22, 21, 19, 17, 15, 14, 12],
    grossMargin: 0.68,
    salesChange: -0.38,
    inventory: { quantity: 30, unit: "杯", daysToExpiry: 10 },
    combos: [
      { with: "曲奇", rate: 0.41 },
      { with: "巧克力布朗尼", rate: 0.19 },
    ],
  },
  {
    id: "tiramisu",
    name: "提拉米苏",
    type: "dish",
    dailySales: [15, 16, 15, 16, 17, 17, 18],
    grossMargin: 0.4,
    salesChange: 0.05,
    inventory: { quantity: 20, unit: "份", daysToExpiry: 3 },
    combos: [
      { with: "冰美式", rate: 0.33 },
      { with: "经典拿铁", rate: 0.22 },
    ],
  },
  {
    id: "croissant",
    name: "牛角包",
    type: "dish",
    dailySales: [30, 29, 28, 28, 27, 26, 25],
    grossMargin: 0.28,
    salesChange: -0.16,
    inventory: { quantity: 26, unit: "个", daysToExpiry: 1 },
    combos: [
      { with: "经典拿铁", rate: 0.46 },
      { with: "冰美式", rate: 0.24 },
    ],
  },
  {
    id: "oat-latte",
    name: "燕麦拿铁",
    type: "dish",
    dailySales: [12, 12, 13, 13, 14, 14, 15],
    grossMargin: 0.6,
    salesChange: 0.1,
    inventory: { quantity: 120, unit: "杯", daysToExpiry: 12 },
    combos: [{ with: "可颂", rate: 0.28 }],
  },
  {
    id: "matcha-latte",
    name: "抹茶拿铁",
    type: "dish",
    dailySales: [9, 10, 9, 10, 10, 11, 11],
    grossMargin: 0.62,
    salesChange: 0.22,
    inventory: { quantity: 40, unit: "杯", daysToExpiry: 12 },
    combos: [],
  },
  {
    id: "milk",
    name: "鲜牛奶",
    type: "ingredient",
    dailySales: [],
    grossMargin: null,
    salesChange: null,
    inventory: { quantity: 42, unit: "盒", daysToExpiry: 1 },
    combos: [],
  },
  {
    id: "cream",
    name: "淡奶油",
    type: "ingredient",
    dailySales: [],
    grossMargin: null,
    salesChange: null,
    inventory: { quantity: 18, unit: "盒", daysToExpiry: 2 },
    combos: [],
  },
  {
    id: "coffee-bean",
    name: "咖啡豆",
    type: "ingredient",
    dailySales: [],
    grossMargin: null,
    salesChange: null,
    inventory: { quantity: 12, unit: "包", daysToExpiry: 35 },
    combos: [],
  },
  {
    id: "oat-milk",
    name: "燕麦奶",
    type: "ingredient",
    dailySales: [],
    grossMargin: null,
    salesChange: null,
    inventory: { quantity: 10, unit: "盒", daysToExpiry: 20 },
    combos: [],
  },
];
