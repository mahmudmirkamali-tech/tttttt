import type { MetalId } from "@/lib/atelier/model";

const TONE: Record<MetalId, { bg: string; border: string }> = {
  brass: { bg: "bg-brass", border: "border-brass" },
  copper: { bg: "bg-clay", border: "border-clay" },
  silver: { bg: "bg-cream", border: "border-cream" },
  obsidian: { bg: "bg-faint", border: "border-faint" },
};

const GROUND: Record<string, string> = {
  night: "bg-ink",
  clay: "bg-clay/25",
  ash: "bg-raised",
  void: "bg-canvas",
  goldground: "bg-brass/25",
};

export function Motif({
  form,
  metal,
  ground,
  air,
  className,
}: {
  form: string;
  metal: MetalId;
  ground: string;
  air: string;
  className?: string;
}) {
  const tone = TONE[metal];
  const groundClass = GROUND[ground] ?? "bg-ink";
  return (
    <div className={`relative overflow-hidden ${groundClass} ${className ?? ""}`}>
      <div className="pointer-events-none absolute inset-3 border border-cream/15" />
      <Shape form={form} tone={tone} groundClass={groundClass} />
      {air === "haze" ? <div className="pointer-events-none absolute inset-0 bg-cream/10" /> : null}
      {air === "spark" ? (
        <>
          <span className={`absolute top-5 right-5 h-2 w-2 rounded-full ${tone.bg}`} />
          <span className={`absolute bottom-6 left-6 h-1.5 w-1.5 rounded-full ${tone.bg}`} />
          <span className={`absolute top-1/3 left-5 h-1 w-1 rounded-full ${tone.bg}`} />
        </>
      ) : null}
      {air === "rareglow" ? (
        <div className="pointer-events-none absolute inset-5 rounded-full border-2 border-brass" />
      ) : null}
    </div>
  );
}

function Shape({
  form,
  tone,
  groundClass,
}: {
  form: string;
  tone: { bg: string; border: string };
  groundClass: string;
}) {
  if (form === "lantern") {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-4/5 w-2/5 flex-col items-center gap-2">
          <span className={`h-2 w-1/2 ${tone.bg}`} />
          <span className={`w-full flex-1 rounded-full ${tone.bg}`} />
          <span className={`h-2 w-2/3 ${tone.bg}`} />
        </div>
      </div>
    );
  }
  if (form === "arch") {
    return (
      <div className={`absolute inset-x-8 bottom-5 top-10 rounded-t-full border-8 bg-transparent ${tone.border}`} />
    );
  }
  if (form === "seal") {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`h-2/3 w-2/3 rounded-full border-8 bg-transparent ${tone.border}`} />
        <span className={`absolute h-1/4 w-1/4 rounded-full ${tone.bg}`} />
      </div>
    );
  }
  if (form === "moon") {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`h-2/3 w-2/3 rounded-full ${tone.bg}`} />
        <span className={`absolute h-2/3 w-2/3 translate-x-5 rounded-full ${groundClass}`} />
      </div>
    );
  }
  if (form === "ring") {
    return (
      <span
        className={`absolute top-1/2 left-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full border-8 bg-transparent ${tone.border}`}
      />
    );
  }
  if (form === "tablet") {
    return (
      <div className="absolute inset-x-8 top-1/4 flex flex-col gap-3">
        <span className={`h-3 w-full ${tone.bg}`} />
        <span className={`h-3 w-4/5 opacity-80 ${tone.bg}`} />
        <span className={`h-3 w-full ${tone.bg}`} />
        <span className={`h-3 w-2/3 opacity-70 ${tone.bg}`} />
      </div>
    );
  }
  return (
    <div className="absolute inset-0">
      <span className={`absolute top-1/3 left-1/3 h-8 w-8 rotate-12 ${tone.bg}`} />
      <span className={`absolute top-1/4 right-1/3 h-6 w-6 -rotate-6 opacity-80 ${tone.bg}`} />
      <span className={`absolute bottom-1/4 left-1/4 h-5 w-5 rotate-45 ${tone.bg}`} />
      <span className={`absolute right-1/4 bottom-1/3 h-10 w-4 ${tone.bg}`} />
    </div>
  );
}
