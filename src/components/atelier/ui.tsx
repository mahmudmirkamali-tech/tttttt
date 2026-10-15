import { useState, type ReactNode } from "react";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyButton({ text, label = "کپی" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  return (
    <button
      type="button"
      className="min-h-11 shrink-0 rounded-full border border-line bg-surface px-4 text-sm text-cream"
      onClick={() => {
        void copyText(text).then((ok) => {
          setState(ok ? "ok" : "fail");
          window.setTimeout(() => setState("idle"), 1400);
        });
      }}
    >
      {state === "ok" ? "کپی شد" : state === "fail" ? "نشد" : label}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  ltr,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ltr?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm text-mute">{label}</span>
      <input
        value={value}
        dir={ltr ? "ltr" : undefined}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-line bg-raised px-3 text-cream"
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm text-mute">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : min}
        onChange={(event) => {
          const next = event.target.valueAsNumber;
          if (Number.isFinite(next)) onChange(next);
        }}
        className="min-h-11 w-full rounded-xl border border-line bg-raised px-3 text-cream tabular-nums"
      />
    </label>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card border border-line bg-surface p-4 ${className}`}>
      {children}
    </section>
  );
}
