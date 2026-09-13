"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/track";
import { loadRecords } from "@/lib/store";
import { recordsToDataset } from "@/lib/normalize";

const RULE_LABEL = {
  R1: "销量下滑预警",
  R2: "组合机会",
  R3: "毛利风险",
  R4: "库存临期",
};

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // 向后端要建议。空 body 表示用服务端的示例数据。
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          recordsToDataset(loadRecords()).length
            ? { data: recordsToDataset(loadRecords()) }
            : {}
        ),
      });
      if (!res.ok) throw new Error(`接口返回 ${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setError(e?.message || "请求失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    track("home_view", { page: "经营首页" });
    load();
  }, [load]);

  const stats = result?.stats;
  const win = result?.window;
  const cards = result?.cards ?? [];
  const top = cards[0];

  const changePct = stats ? stats.weightedChange * 100 : 0;
  const changeLabel = `${changePct >= 0 ? "▲ +" : "▼ "}${Math.abs(changePct).toFixed(1)}%`;
  const changeDown = changePct < 0;

  const onAdviceClick = (card) =>
    track("advice_card_click", {
      id: card?.id,
      ruleId: card?.ruleId,
      target: card?.target,
    });

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              经营首页
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              本周经营概览 · 独立咖啡小店 · 数据来自后端接口
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/data"
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              上传 / 更新数据
            </Link>
            <button
              onClick={load}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
            >
              {loading ? "生成中…" : "重新生成"}
            </button>
          </div>
        </header>

        {loading && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
            正在向后端请求建议（POST /api/generate）…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            请求失败：{error}
            <button onClick={load} className="ml-3 underline">
              重试
            </button>
          </div>
        )}

        {result && !loading && !error && (
          <>
            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="本周营业额"
                value={`¥${stats.weeklyRevenue.toLocaleString()}`}
                sub={win ? `${win.period}合计` : "最近 7 天合计"}
                accent="text-indigo-500"
              >
                <SvgIcon kind="money" />
              </StatCard>
              <StatCard
                label="销量环比（较上周）"
                value={changeLabel}
                sub={`本周销量 ${stats.totalUnits.toLocaleString()} 份 · 较上周`}
                down={changeDown}
              >
                <SvgIcon kind="trend" down={changeDown} />
              </StatCard>
              <StatCard
                label="毛利率"
                value={`${Math.round(stats.weightedMargin * 100)}%`}
                sub="按营收加权"
                accent="text-emerald-500"
              >
                <SvgIcon kind="margin" />
              </StatCard>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {top && (
                <Link
                  href={`/advice/${encodeURIComponent(top.id)}`}
                  onClick={() => onAdviceClick(top)}
                  className="group block overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white transition hover:opacity-95 sm:col-span-2 sm:p-8"
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    本周最该做的一件事
                  </span>
                  <p className="mt-5 text-xl font-semibold leading-snug sm:text-2xl">
                    {top.conclusion}
                  </p>
                  <p className="mt-6 inline-flex items-center gap-1 text-sm text-indigo-100 group-hover:text-white">
                    查看完整建议 →
                  </p>
                </Link>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                  全部建议（{cards.length} 条）
                </p>
                <div className="mt-3 space-y-2">
                  {cards.slice(1, 4).map((c) => (
                    <Link
                      key={c.id}
                      href={`/advice/${encodeURIComponent(c.id)}`}
                      onClick={() => onAdviceClick(c)}
                      className="block rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
                    >
                      <span className="font-semibold">{c.ruleId}</span> ·{" "}
                      {RULE_LABEL[c.ruleId] || "建议"} · {c.target}
                    </Link>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  后端一次性返回 {cards.length} 条，点任一条进详情
                </p>
              </div>
            </section>

            <p className="mt-6 text-xs text-slate-400">
              数据生成时间：{new Date(result.generatedAt).toLocaleString()}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, sub, children, down, accent = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={down ? "text-rose-500" : "text-slate-400"}>{children}</span>
      </div>
      <p className={`mt-3 text-2xl font-semibold ${down ? "text-rose-600" : accent}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function SvgIcon({ kind, down }) {
  const cls = `h-5 w-5 ${down ? "text-rose-500" : "currentColor"}`;
  if (kind === "money") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }
  if (kind === "trend") {
    return down ? (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 7l6 6 4-4 8 8" />
        <path d="M17 17h4v-4" />
      </svg>
    ) : (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M17 7h4v4" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}
