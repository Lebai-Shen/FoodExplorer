"use client";

import { useEffect, useState } from "react";
import { getTrialLeft, resetTrial, TRIAL_TOTAL } from "@/lib/trial";

export default function SettingsPage() {
  const [left, setLeft] = useState(TRIAL_TOTAL);

  useEffect(() => {
    setLeft(getTrialLeft());
  }, []);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[780px] px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">设置</h1>
        <p className="mt-1 text-sm text-slate-500">店铺、账号、订阅</p>

        <p className="mt-6 text-xs text-slate-400">店铺信息</p>
        <div className="mt-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">
          店铺名称 / 类型 / 规模
        </div>

        <p className="mt-6 text-xs text-slate-400">账号与登录</p>
        <div className="mt-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">
          已登录：138****0000 · 绑定手机号 / 退出登录
        </div>

        <p className="mt-6 text-xs text-slate-400">订阅 / 试用</p>
        <div className="mt-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">
          剩余免费生成次数：{left} · 升级订阅
        </div>

        <p className="mt-6 text-xs text-slate-400">演示工具</p>
        <button
          onClick={() => setLeft(resetTrial())}
          className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
        >
          重置试用次数
        </button>
      </div>
    </main>
  );
}
