"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/track";
import { setAdviceState, loadRecords, loadGrain, dishSnapshot } from "@/lib/store";
import { dateRange, recordsToDataset, windowForGrain } from "@/lib/normalize";

// 记下"我做了"当时的日期和基线，方便之后核对效果。
function latestPeriod() {
  const r = dateRange(loadRecords());
  return r ? r.to : null;
}

// 跟建议列表用同一个分析口径（日 / 周 / 月 / 季）。
function latestRows() {
  return recordsToDataset(loadRecords(), windowForGrain(loadGrain()).days);
}

export default function MarkDoneButton({ id, target }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDone(window.localStorage.getItem(`advice-done-${id}`) === "1");
  }, [id]);

  const toggle = () => {
    if (typeof window === "undefined") return;
    const next = !done;
    setDone(next);
    if (next) {
      window.localStorage.setItem(`advice-done-${id}`, "1");
      track("advice_mark_done", { id });
      setAdviceState(id, {
        status: "accepted",
        acceptedAt: new Date().toISOString(),
        period: latestPeriod(),
        baseline: dishSnapshot(latestRows(), target),
      });
      // 同时把采纳记录发到后端（demo 用内存存储）
      fetch("/api/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adviceId: id }),
      }).catch(() => {});
    } else {
      window.localStorage.removeItem(`advice-done-${id}`);
      setAdviceState(id, { status: "todo" });
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p className="text-sm font-semibold text-slate-900">执行这条建议了吗？</p>
        <p className="mt-1 text-xs text-slate-400">
          点一下记录，方便之后看效果。记录保存在本机。
        </p>
      </div>
      <button
        onClick={toggle}
        className={
          done
            ? "shrink-0 rounded-lg bg-emerald-100 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition"
            : "shrink-0 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        }
      >
        {done ? "已记录 · 我做了" : "我做了"}
      </button>
    </div>
  );
}
