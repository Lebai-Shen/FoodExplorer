// 前端埋点：先用 console.log 标记事件，后续可替换成真实分析平台。
// 事件名示例：home_view / advice_card_click / advice_mark_done
export function track(event, props = {}) {
  if (typeof window === "undefined") return;
  console.log(`[track] ${event}`, {
    ts: new Date().toISOString(),
    ...props,
  });
}
