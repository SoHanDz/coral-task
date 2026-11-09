"use client";

import { useEffect, useOptimistic, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { NotesBodySkeleton, type NotesTab } from "@/components/notes/NotesSkeletons";

const TABS = [
  { key: "notes", label: "Ghi chú", href: "/notes" },
  { key: "daily", label: "Theo ngày", href: "/notes?tab=daily" },
] as const;

/**
 * Tab bar plus the tab body. Clicking a tab highlights it and swaps in that
 * tab's skeleton immediately, while the server renders the real content in the
 * background — a search-param change alone never triggers `loading.tsx`.
 */
export function NotesTabs({ active, children }: { active: NotesTab; children: ReactNode }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(active);

  useEffect(() => {
    for (const tab of TABS) router.prefetch(tab.href);
  }, [router]);

  function select(tab: (typeof TABS)[number]) {
    if (tab.key === shown) return;
    startTransition(() => {
      setShown(tab.key);
      router.push(tab.href);
    });
  }

  return (
    <>
      <nav aria-label="Chế độ ghi chú" className="mb-4 flex gap-2">
        {TABS.map((tab) => (
          <a
            key={tab.key}
            href={tab.href}
            aria-current={tab.key === shown ? "page" : undefined}
            onClick={(e) => {
              // Let modified clicks (new tab, etc.) behave like a normal link.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              select(tab);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab.key === shown
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>
      {shown === active ? children : <NotesBodySkeleton tab={shown} />}
    </>
  );
}
