import { demoData } from "@/lib/demoData";
import { runAllRules } from "@/lib/rules";
import Link from "next/link";
import MarkDoneButton from "./MarkDoneButton";

export const metadata = { title: "建议详情 · FoodExplorer" };

const RULE_LABEL = {
  R1: "销量下滑预警",
  R2: "组合机会",
  R3: "毛利风险",
  R4: "库存临期",
};

export default async function AdviceDetailPage({ params }) {
  const { id } = await params;
  const cards = runAllRules(demoData);
  const card = cards.find((c) => c.id === id);

  if (!card) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">没有找到这条建议</h1>
          <p className="mt-2 text-sm text-slate-500">它可能已被移除，或数据已经更新。</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          返回首页
        </Link>

        <div className="mt-6 flex items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
            {card.ruleId} · {RULE_LABEL[card.ruleId] || "经营建议"}
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
          {card.conclusion}
        </h1>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-slate-500">依据</h2>
          <p className="mt-2 text-slate-800">{card.evidence}</p>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-slate-500">什么情况别听</h2>
          <p className="mt-2 text-slate-800">{card.risk}</p>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-slate-500">预期效果</h2>
          <p className="mt-2 text-slate-800">{card.expectedEffect}</p>
        </section>

        <div className="mt-8">
          <MarkDoneButton id={card.id} target={card.target} />
        </div>
      </div>
    </main>
  );
}
