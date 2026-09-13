"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { demoData } from "@/lib/demoData";
import { getTrialLeft, consumeTrialOnce, resetTrial, TRIAL_TOTAL } from "@/lib/trial";
import {
  loadRecords,
  findConflicts,
  mergeRecords,
  clearRecords,
  loadUploadLog,
  appendUploadLog,
  clearUploadLog,
  loadGrain,
  saveGrain,
} from "@/lib/store";
import {
  rowsToRecords,
  recordsToDataset,
  aggregate,
  dateRange,
  windowForGrain,
  DEFAULT_GRAIN,
} from "@/lib/normalize";
import { validateDishes } from "@/lib/validate";

const GRAINS = [
  { id: "day", label: "日" },
  { id: "week", label: "周" },
  { id: "month", label: "月" },
  { id: "quarter", label: "季" },
];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const EMPTY_ROW = { name: "", units: "", price: "", cost: "", qty: "", unit: "份", expiry: "" };
const DEFAULT_MANUAL = [
  { name: "经典拿铁", units: "45", price: "28", cost: "7.8", qty: "200", unit: "杯", expiry: "14" },
  { name: "冰美式", units: "43", price: "22", cost: "7.5", qty: "180", unit: "杯", expiry: "14" },
  { name: "焦糖玛奇朵", units: "11", price: "30", cost: "9.6", qty: "30", unit: "杯", expiry: "10" },
  { name: "牛角包", units: "24", price: "15", cost: "10.8", qty: "26", unit: "个", expiry: "1" },
];

export default function DataPage() {
  const [tab, setTab] = useState("manual");
  const [grain, setGrain] = useState(DEFAULT_GRAIN);
  const [records, setRecords] = useState([]);
  const [log, setLog] = useState([]);
  const [left, setLeft] = useState(TRIAL_TOTAL);
  const [status, setStatus] = useState("idle");
  const [cards, setCards] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualRows, setManualRows] = useState(DEFAULT_MANUAL);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [usedWindow, setUsedWindow] = useState(null);
  const fileRef = useRef(null);

  const refresh = () => {
    const rs = loadRecords();
    setRecords(rs);
    setLog(loadUploadLog());
    const ds = recordsToDataset(rs, windowForGrain(loadGrain()).days);
    setWarnings(ds.length ? validateDishes(ds) : []);
  };

  useEffect(() => {
    setLeft(getTrialLeft());
    setManualDate(today());
    setGrain(loadGrain());
    refresh();
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "解析失败");
      if (!json.records?.length) throw new Error(json.issues?.[0] || "没读到有效数据");

      const conflicts = findConflicts(json.records);
      if (conflicts.length) {
        const ok = window.confirm(
          `这次的 ${json.records.length} 条明细里，有 ${conflicts.length} 条和已有数据重复（同一天、同一道菜）。继续将覆盖这些数据，确定吗？`
        );
        if (!ok) {
          setNotice("已取消上传，数据保持不变。");
          return;
        }
      }

      const { added, updated } = mergeRecords(json.records);
      appendUploadLog({
        file: file.name,
        count: json.records.length,
        added,
        updated,
        range: json.range,
      });
      refresh();
      setNotice(
        `已上传「${file.name}」：${json.records.length} 条明细（新增 ${added}，覆盖 ${updated}）${
          json.range ? `，覆盖 ${json.range.from} ~ ${json.range.to}` : ""
        }。`
      );
      if (json.issues?.length) setError(json.issues.join(" "));
    } catch (e) {
      setError(e?.message || "上传失败");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const updateManualRow = (idx, key, value) =>
    setManualRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  const addManualRow = () => setManualRows((rows) => [...rows, { ...EMPTY_ROW }]);
  const removeManualRow = (idx) =>
    setManualRows((rows) => rows.filter((_, i) => i !== idx));

  const saveManual = () => {
    if (!manualDate) {
      setError("请先选这批数据的日期。");
      return;
    }
    const rows = manualRows
      .filter((r) => r.name && r.name.trim())
      .map((r) => ({
        日期: manualDate,
        菜品名: r.name,
        销量: r.units,
        售价: r.price,
        成本: r.cost,
        库存量: r.qty,
        单位: r.unit,
        剩余保质天数: r.expiry,
      }));
    const { records: recs, issues } = rowsToRecords(rows);
    if (!recs.length) {
      setError(issues[0] || "没有读到有效数据。");
      return;
    }
    const conflicts = findConflicts(recs);
    if (
      conflicts.length &&
      !window.confirm(
        `${manualDate} 这天已经有 ${conflicts.length} 条同名菜品的数据，继续将覆盖，确定吗？`
      )
    ) {
      setNotice("已取消，数据保持不变。");
      return;
    }
    const { added, updated } = mergeRecords(recs);
    appendUploadLog({
      file: `手动录入 ${manualDate}`,
      count: recs.length,
      added,
      updated,
      range: { from: manualDate, to: manualDate },
    });
    refresh();
    setNotice(`已保存 ${manualDate} 的 ${recs.length} 条数据（新增 ${added}，覆盖 ${updated}）。`);
    setError(null);
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    setAnalysisError(null);
    try {
      const ds = recordsToDataset(loadRecords(), win.days);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(ds.length ? { data: ds } : {}), grain }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "分析失败");
      setAnalysis(json.analysis);
      setWarnings(json.warnings || []);
    } catch (e) {
      setAnalysisError(e?.message || "分析失败");
    } finally {
      setAnalyzing(false);
    }
  };

  const generate = async () => {
    if (left <= 0) {
      setError("免费次数已用完，登录后可每周免费 1 条，或订阅不限量。");
      setStatus("error");
      return;
    }
    const ds = recordsToDataset(loadRecords(), win.days);
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          ds.length ? { data: ds, grain } : { data: demoData, grain }
        ),
      });
      if (!res.ok) throw new Error(`接口返回 ${res.status}`);
      const json = await res.json();
      consumeTrialOnce();
      setLeft(getTrialLeft());
      setCards(json.cards || []);
      setUsedWindow(json.window || win);
      setStatus("done");
    } catch (e) {
      setError(e?.message || "生成失败");
      setStatus("error");
    }
  };

  const doClear = () => {
    if (!window.confirm("确定清空所有已上传的数据吗？这个操作不可恢复。")) return;
    clearRecords();
    clearUploadLog();
    refresh();
    setNotice("已清空所有数据。");
  };

  const win = windowForGrain(grain);
  const agg = aggregate(records, grain);
  const maxRev = Math.max(1, ...agg.map((a) => a.revenue));
  const range = dateRange(records);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[820px] px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">数据</h1>
        <p className="mt-1 text-sm text-slate-500">
          上传按日期的明细，系统自动按日 / 周 / 月 / 季汇总
        </p>

        <div className="mt-6 flex border-b border-slate-200">
          {[
            { id: "manual", label: "手动录入" },
            { id: "excel", label: "上传 Excel / CSV" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "flex-1 border-b-2 border-indigo-600 py-2 text-sm font-semibold text-indigo-600"
                  : "flex-1 border-b-2 border-transparent py-2 text-sm text-slate-500"
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "manual" ? (
          <div className="mt-5">
            <label className="block">
              <span className="text-xs text-slate-500">这批数据是哪一天的</span>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {["菜品名", "销量", "售价", "成本", "库存量", "单位", "剩余保质天数", ""].map(
                      (h) => (
                        <th key={h} className="whitespace-nowrap px-2 py-2">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      {["name", "units", "price", "cost", "qty", "unit", "expiry"].map((k) => (
                        <td key={k} className="px-2 py-1">
                          <input
                            value={r[k]}
                            onChange={(e) => updateManualRow(i, k, e.target.value)}
                            className="w-full rounded border border-slate-200 px-2 py-1 outline-none focus:border-indigo-400"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1">
                        <button
                          onClick={() => removeManualRow(i)}
                          title="删除这一行"
                          className="text-slate-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={addManualRow}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:border-indigo-300"
              >
                + 加一行
              </button>
              <button
                onClick={saveManual}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                保存这一天的数据
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/40"
            >
              {uploading ? "正在上传解析…" : "点击或拖拽文件到这里上传"}
              <div className="mt-1 text-xs text-slate-400">
                支持 .xlsx / .csv，文件 ≤ 5MB
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <a href="/api/upload" download className="text-indigo-600 underline">
                下载数据模板
              </a>
              <span className="text-slate-400">
                表头：{"日期 / 菜品名 / 销量 / 售价 / 成本 / 库存量 / 单位 / 剩余保质天数"}
              </span>
            </div>
          </div>
        )}

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            {notice}
          </div>
        )}
        {warnings.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-xs text-orange-600">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}

        {/* 当前数据 */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
          当前数据：{records.length} 条明细
          {range ? ` · 覆盖 ${range.from} ~ ${range.to}` : ""}
          {records.length > 0 && (
            <button onClick={doClear} className="ml-3 text-rose-600 underline">
              清空全部
            </button>
          )}
        </div>

        {/* 上传日志 */}
        <div className="mt-6">
          <p className="text-xs text-slate-400">上传记录</p>
          {log.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">还没有上传过数据。</p>
          ) : (
            <div className="mt-2 space-y-2">
              {[...log].reverse().map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500"
                >
                  <span className="font-medium text-slate-700">{e.file}</span> · {e.count} 条（新增{" "}
                  {e.added}，覆盖 {e.updated}）
                  {e.range ? ` · ${e.range.from} ~ ${e.range.to}` : ""} ·{" "}
                  {new Date(e.at).toLocaleString()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 看板 */}
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">数据看板</p>
            <div className="flex gap-1">
              {GRAINS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setGrain(g.id);
                    saveGrain(g.id);
                  }}
                  className={
                    grain === g.id
                      ? "rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600"
                      : "rounded-md px-2 py-0.5 text-xs text-slate-500"
                  }
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          {agg.length === 0 ? (
            <div className="mt-2 flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
              上传数据后这里会显示按{grain === "day" ? "日" : grain === "week" ? "周" : grain === "month" ? "月" : "季"}的汇总
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4">
              <div className="space-y-2">
                {agg.map((a) => (
                  <div key={a.key} className="flex items-center gap-3 text-xs">
                    <span className="w-20 shrink-0 text-slate-500">{a.key}</span>
                    <div className="h-3 flex-1 rounded-full bg-slate-100">
                      <div
                        className="h-3 rounded-full bg-indigo-500"
                        style={{ width: `${Math.round((a.revenue / maxRev) * 100)}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-slate-600">
                      ¥{Math.round(a.revenue).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI 初步分析 */}
        <div className="mt-6">
          <p className="text-xs text-slate-400">AI 初步分析</p>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="mt-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
          >
            {analyzing ? "正在分析…" : "让 AI 分析一下这批数据"}
          </button>
          {analysisError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {analysisError}
            </div>
          )}
          {analysis && (
            <div className="mt-3 whitespace-pre-wrap rounded-xl border border-indigo-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
              {analysis}
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-400">
          当前分析口径：{win.label} · {win.period} vs {win.prev}
          （跟着上面的看板粒度走，生成建议和 AI 分析都用这个口径）
        </p>

        <div className="mt-3 flex items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs text-orange-700">
            剩余免费次数：{left}
          </span>
          <button
            onClick={() => {
              setLeft(resetTrial());
              setStatus("idle");
              setError(null);
            }}
            className="text-xs text-slate-400 underline hover:text-slate-600"
          >
            重置（演示用）
          </button>
        </div>

        <button
          onClick={generate}
          disabled={status === "loading" || uploading}
          className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {status === "loading" ? "正在生成…" : "开始生成经营建议"}
        </button>

        {status === "done" && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            已生成 {cards.length} 条建议
            {usedWindow ? `（口径：${usedWindow.period} vs ${usedWindow.prev}）` : ""}。
            <Link href="/advice" className="ml-2 font-semibold underline">
              去查看 →
            </Link>
          </div>
        )}
        {status === "error" && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
