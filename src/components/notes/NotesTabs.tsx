import Link from "next/link";

const TABS = [
  { key: "notes", label: "Ghi chú", href: "/notes" },
  { key: "daily", label: "Theo ngày", href: "/notes?tab=daily" },
] as const;

export function NotesTabs({ active }: { active: "notes" | "daily" }) {
  return (
    <nav aria-label="Chế độ ghi chú" className="mb-4 flex gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab.key === active
              ? "bg-slate-800 text-white"
              : "bg-white text-slate-600 hover:bg-slate-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
