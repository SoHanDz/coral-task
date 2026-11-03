"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check } from "lucide-react";
import { updateSettings } from "@/app/actions/settings";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useSiteSettings } from "@/components/settings/SiteSettingsProvider";
import { Button } from "@/components/ui/button";
import { applyAppearance } from "@/lib/settings/apply";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SETTINGS,
  PRIMARY_COLOR_PRESETS,
  RADIUS_OPTIONS,
  SIDEBAR_STYLES,
  foregroundFor,
  isValidHexColor,
  type SiteSettings,
  type WeekStart,
} from "@/lib/settings/theme";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A row of mutually exclusive choices. */
function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (key: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={String(o.key)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsForm({ saved: initial }: { saved: SiteSettings }) {
  const { setSettings } = useSiteSettings();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  // Appearance changes preview live on the whole site; nothing persists until "Lưu".
  function change(patch: Partial<SiteSettings>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setMessage(null);
    applyAppearance(next);
  }

  function save() {
    startTransition(async () => {
      try {
        await updateSettings(draft);
        setSaved(draft);
        setSettings(draft);
        setMessage({ text: "Đã lưu cấu hình.", error: false });
      } catch (e) {
        setMessage({ text: e instanceof Error ? e.message : "Không thể lưu cấu hình.", error: true });
      }
    });
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const colorValid = isValidHexColor(draft.primaryColor);

  return (
    <div className="space-y-5">
      <Section
        title="Màu chủ đạo"
        description="Nút, thanh bên, biểu tượng và các thành phần nhấn sẽ đổi theo màu bạn chọn."
      >
        <div className="flex flex-wrap gap-3">
          {PRIMARY_COLOR_PRESETS.map((preset) => {
            const active = preset.value.toLowerCase() === draft.primaryColor.toLowerCase();
            return (
              <button
                key={preset.value}
                type="button"
                title={preset.name}
                aria-label={preset.name}
                aria-pressed={active}
                onClick={() => change({ primaryColor: preset.value })}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-shadow",
                  active ? "ring-2 ring-foreground/70" : "hover:ring-2 hover:ring-foreground/20"
                )}
                style={{ backgroundColor: preset.value, color: foregroundFor(preset.value) }}
              >
                {active && <Check className="size-4" />}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <label className="text-sm font-medium" htmlFor="custom-color">
            Màu tùy chọn
          </label>
          <input
            id="custom-color"
            type="color"
            value={colorValid ? draft.primaryColor : DEFAULT_SETTINGS.primaryColor}
            onChange={(e) => change({ primaryColor: e.target.value })}
            className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
          />
          <code className="rounded-md bg-muted px-2 py-1 text-xs">{draft.primaryColor}</code>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 p-4">
          <Button type="button">Nút chính</Button>
          <Button type="button" variant="outline">
            Nút phụ
          </Button>
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            Nhãn nhấn
          </span>
        </div>
      </Section>

      <Section title="Độ bo góc" description="Áp dụng cho nút, thẻ, ô nhập và hộp thoại.">
        <Segmented
          value={draft.radius}
          options={RADIUS_OPTIONS}
          onChange={(radius) => change({ radius })}
        />
      </Section>

      <Section title="Thanh bên" description="Kiểu hiển thị của thanh điều hướng bên trái.">
        <Segmented
          value={draft.sidebarStyle}
          options={SIDEBAR_STYLES}
          onChange={(sidebarStyle) => change({ sidebarStyle })}
        />
      </Section>

      <Section
        title="Mục điều hướng"
        description="Bật hoặc tắt các mục hiển thị ở thanh bên và thanh dưới trên điện thoại. Mục Cấu hình luôn hiển thị."
      >
        <div className="flex flex-wrap gap-2">
          {NAV_ITEMS.filter((item) => item.href !== "/settings").map((item) => {
            const shown = !draft.navHidden.includes(item.href);
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                aria-pressed={shown}
                onClick={() =>
                  change({
                    navHidden: shown
                      ? [...draft.navHidden, item.href]
                      : draft.navHidden.filter((h) => h !== item.href),
                  })
                }
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                  shown ? "border-primary bg-accent text-accent-foreground" : "bg-background text-muted-foreground line-through"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Hành vi">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Tuần bắt đầu từ</p>
            <Segmented<WeekStart>
              value={draft.weekStart}
              options={[
                { key: 1, label: "Thứ Hai" },
                { key: 0, label: "Chủ nhật" },
              ]}
              onChange={(weekStart) => change({ weekStart })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Con ma mascot</p>
            <Segmented<string>
              value={draft.mascotEnabled ? "on" : "off"}
              options={[
                { key: "on", label: "Hiện" },
                { key: "off", label: "Ẩn" },
              ]}
              onChange={(v) => change({ mascotEnabled: v === "on" })}
            />
          </div>
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={!dirty || !colorValid || pending}>
          {pending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => change(DEFAULT_SETTINGS)}>
          Đặt lại mặc định
        </Button>
        {message && (
          <p className={cn("text-sm", message.error ? "text-destructive" : "text-muted-foreground")}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
