"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadRecords,
  dishSnapshot,
  loadAdviceState,
  setAdviceState,
  loadGrain,
} from "@/lib/store";
import { recordsToDataset, dateRange, windowForGrain } from "@/lib/normalize";

const RULE_LABEL = {
  R1: "销量下滑预警",
  R2: "组合机会",
  R3: "毛利风险",
  R4: "库存临期",
};

const FILTERS = [
  { id: "todo", label: "待处理" },
  { id: "accepted", label: "进行中" },
  { id: "verified", label: "已验证" },
];

const pctText = (v) =>
  v === null || v === undefined ? "-" : `${Math.round(v * 100)}%`;

function currentLabel() {
  const r = dateRange(loadRecords());
  return r ? r.to : null;
}

// 建议统一按看板上选的口径来看：日 / 周 / 月 / 季。
function currentWindow() {
  return windowForGrain(loadGrain());
}

export default function AdviceListPage() {
  const [cards, setCards] = useState([]);
  const [state, setState] = useState({});
  const [filter, setFilter] = useState("todo");
  const [loading, setLoading] = useState(true);
  const [win, setWin] = useState(null);

  const refresh = () => setState(loadAdviceState());

  useEffect(() => {
    const w = currentWindow();
    setWin(w);
    const ds = recordsToDataset(loadRecords(), w.days);
    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(ds.length ? { data: ds } : {}), grain: w.grain }),
    })
      .then((r) => r.json())
      .then((j) => setCards(j.cards || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    refresh();
  }, []);

  const statusOf = (id) => state[id]?.status || "todo";

  const accept = (card) => {
    const ds = recordsToDataset(loadRecords(), currentWindow().days);
    setAdviceState(card.id, {
      status: "accepted",
      acceptedAt: new Date().toISOString(),
      period: currentLabel(),
      baseline: dishSnapshot(ds, card.target),
    });
    fetch("/api/adopt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adviceId: card.id }),
    }).catch(() => {});
    refresh();
    setFilter("accepted");
  };

  const dismiss = (card) => {
    setAdviceState(card.id, {
      status: "dismissed",
      dismissedAt: new Date().toISOString(),
    });
    refresh();
  };

  const verify = (card, valid) => {
    setAdviceState(card.id, {
      status: "verified",
      verifiedAt: new Date().toISOString(),
      result: valid ? "有效" : "未见效",
      checkedPeriod: currentLabel(),
    });
    refresh();
  };

  const shown = cards.filter((c) => {
    const s = statusOf(c.id);
    if (filter === "todo") return s === "todo";
    return s === filter;
  });

  const cur = (card) => dishSnapshot(recordsToDataset(loadRecords(), currentWindow().days), card.target);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[780px] px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">建议</h1>
        <p className="mt-1 text-sm text-slate-500">
          按优先级排列 · 口径：{win ? `${win.period} vs ${win.prev}` : "最近 7 天 vs 前 7 天"} ·
          采纳后进入进行中，下个周期回来验证
        </p>

        <div className="mt-5 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={
                filter === f.id
                  ? "rounded-full border border-indigo-400 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600"
                  : "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500"
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && <p className="mt-6 text-sm text-slate-400">正在生成建议…</p>}

        {!loading && shown.length === 0 && (
          <p className="mt-6 text-sm text-slate-400">
            {filter === "todo"
              ? "没有待处理的建议。"
              : filter === "accepted"
                ? "还没有进行中的建议，去待处理里采纳一条吧。"
                : "还没有已验证的建议。"}
          </p>
        )}

        <div className="mt-4 space-y-3">
          {shown.map((c) => {
            const s = state[c.id] || {};
            const base = s.baseline;
            const now = cur(c);
            return (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-indigo-600">{c.ruleId}</span>
                  <span className="text-slate-400">
                    {RULE_LABEL[c.ruleId] || "建议"} · {c.target}
                  </span>
                </div>
                <Link
                  href={`/advice/${encodeURIComponent(c.id)}`}
                  className="mt-2 block text-sm font-medium text-slate-800 hover:text-indigo-600"
                >
                  {c.conclusion}
                </Link>

                {filter === "todo" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => accept(c)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      采纳
                    </button>
                    <button
                      onClick={() => dismiss(c)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400"
                    >
                      不适用
                    </button>
                  </div>
                )}

                {filter === "accepted" && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <p>
                      采纳时数据截至 {s.period || "-"}。基线：销量 {base?.weekUnits ?? "-"} ·
                      毛利率 {pctText(base?.grossMargin)}
                    </p>
                    <p className="mt-1">
                      现在（截至 {currentLabel() || "-"}）：销量 {now?.weekUnits ?? "-"} · 毛利率{" "}
                      {pctText(now?.grossMargin)}
                    </p>
                    {base && now && (
                      <p className="mt-1 text-slate-500">
                        变化：销量{" "}
                        {now.weekUnits !== null && base.weekUnits !== null
                          ? now.weekUnits - base.weekUnits
                          : "-"}
                        ，毛利率{" "}
                        {now.grossMargin !== null && base.grossMargin !== null
                          ? `${Math.round((now.grossMargin - base.grossMargin) * 100)} 个百分点`
                          : "-"}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => verify(c, true)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        确认有效
                      </button>
                      <button
                        onClick={() => verify(c, false)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600"
                      >
                        没效果
                      </button>
                    </div>
                  </div>
                )}

                {filter === "verified" && (
                  <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                    结论：{s.result || "已验证"}（核对时间 {s.checkedPeriod || "-"}）
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
