"use client";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[420px] px-4 py-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">登录 / 创建店铺档案</h1>
          <p className="mt-2 text-sm text-slate-500">
            手机号登录，用于保存你的数据和试用次数
          </p>

          <label className="mt-5 block text-xs text-slate-500">手机号</label>
          <input
            defaultValue="13800000000"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />

          <label className="mt-4 block text-xs text-slate-500">验证码</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              defaultValue="0000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <span className="shrink-0 text-xs text-indigo-600">获取验证码</span>
          </div>

          <button
            onClick={() => router.push("/data")}
            className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            进入 FoodExplorer
          </button>

          <button
            onClick={() => router.push("/data")}
            className="mt-3 w-full text-center text-xs text-slate-500 underline"
          >
            先免费试用 3 次，不登录
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            演示模式：任意手机号可进入，验证码不真发
          </p>
        </div>
      </div>
    </main>
  );
}
