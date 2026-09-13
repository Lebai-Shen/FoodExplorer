// 免费试用次数（demo 用 localStorage 存，真实产品应以登录账号为准）。
const KEY = "fe_trial_used";
const TOTAL = 3;

export function getTrialUsed() {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(KEY) || 0);
}

export function getTrialLeft() {
  return Math.max(0, TOTAL - getTrialUsed());
}

export function consumeTrialOnce() {
  if (typeof window === "undefined") return TOTAL;
  const next = Math.min(TOTAL, getTrialUsed() + 1);
  window.localStorage.setItem(KEY, String(next));
  return Math.max(0, TOTAL - next);
}

// 演示用：把试用次数清零，方便反复测试。
export function resetTrial() {
  if (typeof window === "undefined") return TOTAL;
  window.localStorage.removeItem(KEY);
  return TOTAL;
}

export const TRIAL_TOTAL = TOTAL;
