"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "首页" },
  { href: "/advice", label: "建议" },
  { href: "/data", label: "数据" },
];

export default function TopNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-10 flex h-[60px] items-center gap-5 border-b border-slate-200 bg-white px-5 sm:px-6">
      <Link href="/" className="text-base font-bold text-slate-900">
        FoodExplorer
      </Link>
      <nav className="mx-auto flex gap-1">
        {ITEMS.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={
              isActive(it.href)
                ? "rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600"
                : "rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
            }
          >
            {it.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-xs text-slate-500 hover:text-slate-700">
          138****0000
        </Link>
        <Link
          href="/settings"
          title="设置"
          className={
            pathname.startsWith("/settings")
              ? "text-lg text-indigo-600"
              : "text-lg text-slate-400 hover:text-slate-600"
          }
        >
          ⚙
        </Link>
      </div>
    </header>
  );
}
