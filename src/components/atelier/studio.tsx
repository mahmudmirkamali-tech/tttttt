import { useEffect, useState } from "react";
import { Compass, Layers, Megaphone, Orbit, Route } from "lucide-react";
import { Motif } from "@/components/atelier/motif";
import { Card, CopyButton, Field, NumberField } from "@/components/atelier/ui";
import { CrmBoard, Pipeline, RealKpi } from "@/components/atelier/ops";
import { SignedOut, UserButton } from "@/lib/auth/gates";
import {
  assistantIntent,
  BLOCKED_REPLY,
  CHANNEL_LABEL,
  expectedCounts,
  faNum,
  INTENSITY_LABEL,
  layerStamp,
  metadataJson,
  project,
  sign,
  TRACK_LABEL,
  warLines,
  type Channel,
  type Intensity,
  type Piece,
} from "@/lib/atelier/model";
import { useAtelier } from "@/lib/atelier/store";

type View = "desk" | "make" | "grow" | "publish" | "guide";

const NAV: { id: View; label: string; icon: typeof Compass }[] = [
  { id: "desk", label: "میز", icon: Compass },
  { id: "make", label: "ساخت", icon: Layers },
  { id: "grow", label: "جذب", icon: Orbit },
  { id: "publish", label: "نشر", icon: Megaphone },
  { id: "guide", label: "دستیار", icon: Route },
];

export function Studio() {
  const [view, setView] = useState<View>("desk");
  useEffect(() => {
    void useAtelier.persist.rehydrate();
  }, []);

  return (
    <div className="min-h-dvh bg-canvas text-cream">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <h1 className="text-4xl leading-none text-cream">آتلیه</h1>
            <p className="mt-2 text-sm text-pretty text-mute">
              ساخت مجموعهٔ اصلی، جذب انفجاری تمیز، انتشار اینستا و تلگرام
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SignedOut>
              <a href="/login" className="hidden min-h-11 items-center rounded-full border border-line px-3 text-sm sm:inline-flex">
                ورود
              </a>
            </SignedOut>
            <UserButton />
            <PublishPill />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-4 pb-28 md:grid-cols-[13rem_minmax(0,1fr)] md:pb-10">
        <nav className="hidden md:block">
          <div className="sticky top-4 flex flex-col gap-2">
            {NAV.map((item) => (
              <NavButton key={item.id} item={item} view={view} onPick={setView} />
            ))}
          </div>
        </nav>
        <main className="min-w-0">
          {view === "desk" ? <Desk onPick={setView} /> : null}
          {view === "make" ? <Make /> : null}
          {view === "grow" ? <Grow /> : null}
          {view === "publish" ? <Publish /> : null}
          {view === "guide" ? <Guide /> : null}
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-canvas md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => setView(item.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${
                view === item.id ? "text-brass" : "text-mute"
              }`}
            >
              <item.icon aria-hidden="true" className="size-5" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavButton({
  item,
  view,
  onPick,
}: {
  item: (typeof NAV)[number];
  view: View;
  onPick: (view: View) => void;
}) {
  const active = view === item.id;
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => onPick(item.id)}
      className={`flex min-h-11 items-center gap-3 rounded-full px-4 text-start ${
        active ? "bg-brass text-ink" : "text-cream"
      }`}
    >
      <item.icon aria-hidden="true" className="size-5" />
      {item.label}
    </button>
  );
}

function PublishPill() {
  const published = useAtelier((s) => s.appPublished);
  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-2 text-sm ${
        published ? "border-brass text-brass" : "border-clay text-clay"
      }`}
    >
      {published ? "اپ منتشر شده" : "اپ منتشر نشده"}
    </span>
  );
}

function IdentityForm() {
  const profile = useAtelier((s) => s.profile);
  const setProfile = useAtelier((s) => s.setProfile);
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);
  if (!live) {
    return (
      <p className="text-sm text-mute">
        @{profile.instagram || "page"} · {profile.appName} · {profile.collectionName}
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field ltr label="پیج اینستاگرام" value={profile.instagram} onChange={(instagram) => setProfile({ instagram })} />
      <Field ltr label="کانال تلگرام" value={profile.telegram} onChange={(telegram) => setProfile({ telegram })} />
      <Field ltr label="ایکس" value={profile.xHandle} onChange={(xHandle) => setProfile({ xHandle })} />
      <Field label="نام اپ" value={profile.appName} onChange={(appName) => setProfile({ appName })} />
      <Field label="توضیح اپ" value={profile.appTagline} onChange={(appTagline) => setProfile({ appTagline })} />
      <Field label="نام مجموعه" value={profile.collectionName} onChange={(collectionName) => setProfile({ collectionName })} />
      <Field label="شبکهٔ مقصد" value={profile.chain} onChange={(chain) => setProfile({ chain })} />
      <NumberField label="عرضه" value={profile.supply} min={8} max={10000} onChange={(supply) => setProfile({ supply })} />
    </div>
  );
}

function DirtyBanner() {
  const dirty = useAtelier((s) => {
    const now = sign(s.profile, { note: s.note, blind: s.blindMint, published: s.appPublished });
    return now !== s.signature;
  });
  const compile = useAtelier((s) => s.compile);
  const pushLog = useAtelier((s) => s.pushLog);
  if (!dirty) return null;
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-pretty">نام‌ها عوض شده‌اند. متن‌ها هنوز نسخهٔ قبلی را دارند.</p>
      <button
        type="button"
        className="min-h-11 rounded-full bg-brass px-4 text-ink"
        onClick={() => {
          compile();
          pushLog(["متن‌ها با نام‌های تازه بازنویسی شد."]);
        }}
      >
        بازنویسی متن‌ها
      </button>
    </Card>
  );
}

function Desk({ onPick }: { onPick: (view: View) => void }) {
  const checks = useAtelier((s) => s.checks);
  const pieces = useAtelier((s) => s.pieces);
  const profile = useAtelier((s) => s.profile);
  const loops = useAtelier((s) => s.loops);
  const intensity = useAtelier((s) => s.intensity);
  const done = checks.filter((item) => item.done).length;
  const outlook = project(profile, loops, intensity);
  const tracks = (["app", "art", "growth"] as const).map((track) => {
    const items = checks.filter((item) => item.track === track);
    const closed = items.filter((item) => item.done).length;
    return { track, closed, total: items.length };
  });

  return (
    <div className="flex flex-col gap-4">
      <DirtyBanner />
      <div className="grid gap-3 sm:grid-cols-3">
        {tracks.map((track) => (
          <Card key={track.track}>
            <p className="text-sm text-mute">{TRACK_LABEL[track.track]}</p>
            <p className="mt-2 font-mark text-3xl tabular-nums">
              {faNum(track.closed)}
              <span className="text-mute">/{faNum(track.total)}</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-raised">
              <div
                className="h-full bg-brass"
                style={{ width: `${track.total ? (100 * track.closed) / track.total : 0}%` }}
              />
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-mute">سقف خوش‌بینانهٔ فهرست</p>
            <p className="font-mark text-4xl tabular-nums text-brass">{faNum(outlook.waitlist)}</p>
          </div>
          <p className="max-w-xs text-sm text-pretty text-mute">
            کف موج اول {faNum(outlook.floor)} نفر. {outlook.boost}. این تخمین است، نه وعده.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-full bg-brass px-4 text-ink" onClick={() => onPick("make")}>
            ساخت مجموعه
          </button>
          <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => onPick("publish")}>
            چرخهٔ انتشار
          </button>
          <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => onPick("grow")}>
            موتور جذب
          </button>
        </div>
      </Card>
      <RealKpi />
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-2xl">پیش‌نمایش مجموعه</h2>
          <span className="text-sm text-mute tabular-nums">{faNum(done)} کار بسته</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {pieces.map((piece) => (
            <figure key={piece.id} className="w-28 shrink-0">
              <Motif
                form={piece.form}
                metal={piece.metal}
                ground={piece.ground}
                air={piece.air}
                className="aspect-square rounded-2xl border border-line"
              />
              <figcaption className="mt-2 truncate text-sm">{piece.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
      <details className="rounded-card border border-line bg-surface p-4">
        <summary className="min-h-11 cursor-pointer text-cream">
          هویت: @{profile.instagram || "page"} · {profile.appName} · {profile.collectionName}
        </summary>
        <div className="mt-4">
          <IdentityForm />
        </div>
      </details>
      <p className="text-sm text-pretty text-mute">
        خط قرمز: ربات، حجم جعلی و کپی آثار معروف ساخته نمی‌شود. انفجار یعنی هماهنگی آدم‌ها در ۴۸ ساعت.
      </p>
    </div>
  );
}

function Make() {
  const layers = useAtelier((s) => s.layers);
  const pieces = useAtelier((s) => s.pieces);
  const profile = useAtelier((s) => s.profile);
  const seed = useAtelier((s) => s.seed);
  const rolledStamp = useAtelier((s) => s.rolledStamp);
  const blindMint = useAtelier((s) => s.blindMint);
  const setWeight = useAtelier((s) => s.setWeight);
  const setProfile = useAtelier((s) => s.setProfile);
  const setBlind = useAtelier((s) => s.setBlind);
  const setPieceStory = useAtelier((s) => s.setPieceStory);
  const reroll = useAtelier((s) => s.reroll);
  const [selected, setSelected] = useState("piece-1");
  const piece = pieces.find((item) => item.id === selected) ?? pieces[0];
  const stale = layerStamp(layers) !== rolledStamp;
  const table = expectedCounts(layers, profile.supply);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-3xl">ساخت مجموعه</h2>
        <p className="mt-2 max-w-xl text-sm text-pretty text-mute">
          چهار لایه را وزن بده، هشت پیش‌نمایش را بچین، داستان را اصلاح کن، متادیتا را خودت به مارکت‌پلیس ببر.
          اثرها اصلی هستند.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="عرضهٔ کل"
          value={profile.supply}
          min={8}
          max={10000}
          onChange={(supply) => setProfile({ supply })}
        />
        <Field label="شبکهٔ مقصد" value={profile.chain} onChange={(chain) => setProfile({ chain })} />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={blindMint}
          onChange={(event) => setBlind(event.target.checked)}
        />
        مینت کور: تا روز بازشدن فقط نقش در کپشن بیاید
      </label>
      {stale ? (
        <p className="text-sm text-brass">وزن‌ها عوض شده‌اند. پیش‌نمایش هنوز چیدمان قبلی است.</p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {table.map((layer) => (
            <Card key={layer.id}>
              <h3 className="text-xl">{layer.title}</h3>
              <ul className="mt-3 flex flex-col gap-3">
                {layer.rows.map((row) => (
                  <li key={row.id}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span>{row.name}</span>
                      <span className="text-mute tabular-nums">
                        {faNum(row.pct)}٪ · حدود {faNum(row.count)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={80}
                      value={row.weight}
                      aria-label={`وزن ${row.name}`}
                      onChange={(event) => setWeight(layer.id, row.id, event.target.valueAsNumber)}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-mute tabular-nums">چیدمان {faNum(seed)}</p>
            <button type="button" className="min-h-11 rounded-full bg-brass px-4 text-ink" onClick={reroll}>
              بچین از نو
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {pieces.map((item) => (
              <PieceCard key={item.id} piece={item} active={piece?.id === item.id} onPick={setSelected} />
            ))}
          </div>
        </div>
      </div>
      {piece ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl">{piece.name}</h3>
              <p className="mt-1 text-sm text-mute">
                رده {piece.tier} · یکی از {faNum(piece.oneIn)} · {piece.groundName} · {piece.airName}
              </p>
            </div>
            <CopyButton text={metadataJson([piece], profile)} label="کپی متادیتا" />
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm text-mute">داستان اثر</span>
            <textarea
              value={piece.story}
              rows={4}
              onChange={(event) => setPieceStory(piece.id, event.target.value)}
              className="w-full rounded-xl border border-line bg-raised px-3 py-2 text-cream"
            />
          </label>
          <p className="mt-2 text-sm text-mute">داستان دستی با «بازنویسی متن‌ها» به کپشن می‌رسد. چیدمان تازه پاکش می‌کند.</p>
        </Card>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <CopyButton text={metadataJson(pieces, profile)} label="کپی متادیتای هر ۸ اثر" />
      </div>
      <p className="text-sm text-pretty text-mute">
        آتلیه تراکنش نمی‌زند. این فایل را در مارکت‌پلیس خودت، روی {profile.chain || "شبکهٔ خودت"}، بارگذاری می‌کنی.
      </p>
    </div>
  );
}

function PieceCard({
  piece,
  active,
  onPick,
}: {
  piece: Piece;
  active: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(piece.id)}
      className={`min-w-0 rounded-card border p-2 text-start ${active ? "border-brass" : "border-line"}`}
    >
      <Motif
        form={piece.form}
        metal={piece.metal}
        ground={piece.ground}
        air={piece.air}
        className="aspect-square rounded-xl"
      />
      <span className="mt-2 block truncate text-sm">{piece.name}</span>
      <span className="text-xs text-mute">{piece.tier}</span>
    </button>
  );
}

function Grow() {
  const profile = useAtelier((s) => s.profile);
  const loops = useAtelier((s) => s.loops);
  const intensity = useAtelier((s) => s.intensity);
  const setProfile = useAtelier((s) => s.setProfile);
  const setIntensity = useAtelier((s) => s.setIntensity);
  const toggleLoop = useAtelier((s) => s.toggleLoop);
  const outlook = project(profile, loops, intensity);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-3xl">جذب انفجاری تمیز</h2>
        <p className="mt-2 max-w-xl text-sm text-pretty text-mute">
          کلاه سفیدِ تهاجمی: دعوت واقعی، کنجکاوی، همکاری و یک پنجرهٔ ۴۸ساعته. کلاه سیاه عمداً این‌جا نیست.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(INTENSITY_LABEL) as Intensity[]).map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={intensity === level}
            onClick={() => setIntensity(level)}
            className={`min-h-11 rounded-full px-2 ${
              intensity === level ? "bg-brass text-ink" : "border border-line text-cream"
            }`}
          >
            {INTENSITY_LABEL[level]}
          </button>
        ))}
      </div>
      <Card>
        <p className="text-sm text-mute">{outlook.boost}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Stat label="کف موج اول" value={outlook.floor} />
          <Stat label="سقف فهرست" value={outlook.waitlist} />
          <Stat label="علاقهٔ احتمالی مینت" value={outlook.mintInterest} />
        </div>
        <p className="mt-3 text-sm text-pretty text-mute">
          هیچ‌کدام تضمین نیست. ربات این عدد را بالا نمی‌برد. حلقه‌های روشن: {faNum(outlook.armed)}.
        </p>
      </Card>
      <Card>
        <h3 className="text-xl">فرض‌های واقعی</h3>
        <div className="mt-4 flex flex-col gap-4">
          <Slider
            label="فالوور فعلی پیج"
            value={profile.followers}
            min={0}
            max={20000}
            onChange={(followers) => setProfile({ followers })}
          />
          <Slider
            label="جمع فالوور پیج‌های همکار"
            value={profile.partnerFollowers}
            min={0}
            max={20000}
            onChange={(partnerFollowers) => setProfile({ partnerFollowers })}
          />
          <Slider
            label="درصد استوری که واقعاً دیده و رد می‌شود"
            value={profile.storyShare}
            min={1}
            max={40}
            suffix="٪"
            onChange={(storyShare) => setProfile({ storyShare })}
          />
          <Slider
            label="درصد دعوت پذیرفته"
            value={profile.inviteAccept}
            min={5}
            max={60}
            suffix="٪"
            onChange={(inviteAccept) => setProfile({ inviteAccept })}
          />
        </div>
      </Card>
      <div className="flex flex-col gap-3">
        {loops.map((loop) => (
          <Card key={loop.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xl">{loop.title}</h3>
                <p className="mt-1 text-sm text-pretty text-mute">{loop.detail}</p>
              </div>
              <button
                type="button"
                aria-pressed={loop.armed}
                onClick={() => toggleLoop(loop.id)}
                className={`min-h-11 rounded-full px-4 ${loop.armed ? "bg-brass text-ink" : "border border-line"}`}
              >
                {loop.armed ? "روشن" : "خاموش"}
              </button>
            </div>
            <ol className="mt-3 flex list-decimal flex-col gap-1 pe-4 text-sm text-pretty">
              {loop.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-mute">سنجش: {loop.kpi}</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-raised p-3 text-sm text-cream">
              {loop.asset}
            </pre>
            <div className="mt-3">
              <CopyButton text={loop.asset} label="کپی متن حلقه" />
            </div>
          </Card>
        ))}
      </div>
      {intensity === "blast" ? (
        <Card>
          <h3 className="text-xl">اتاق ۴۸ساعته</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {warLines(profile).map((line) => (
              <li key={line.t} className="flex gap-3 text-sm">
                <span className="w-14 shrink-0 tabular-nums text-brass">{line.t}</span>
                <span>
                  <span className="text-mute">{line.where} — </span>
                  {line.what}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <p className="text-sm text-mute">اتاق ساعت‌به‌ساعت فقط در حالت انفجاری باز می‌شود.</p>
      )}
      <Card>
        <h3 className="text-xl">خط قرمز</h3>
        <p className="mt-2 text-sm text-pretty text-mute">
          این‌ها ابزار ندارند. مجموعه را بی‌اعتماد می‌کنند، پیج را می‌بندند، و بعضی‌هایشان تخلف است.
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          <li>ربات کامنت، بازدید استوری و فالوور جعلی</li>
          <li>حجم معاملهٔ ساختگی و خریدوفروش اثر با خودت</li>
          <li>دایرکت انبوه و منشن‌بمب</li>
          <li>کپی مجموعهٔ معروف به اسم خودت</li>
          <li>صفحهٔ مینت جعلی</li>
          <li>ده‌ها حساب برای جمع کردن وایت‌لیست</li>
        </ul>
        <button
          type="button"
          className="mt-4 min-h-11 rounded-full bg-brass px-4 text-ink"
          onClick={() => setIntensity("blast")}
        >
          به‌جایش حالت انفجاری تمیز
        </button>
      </Card>
      <CrmBoard />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm text-mute">{label}</p>
      <p className="font-mark text-3xl tabular-nums">{faNum(value)}</p>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-brass">
          {faNum(value)}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={Math.min(max, Math.max(min, value))}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </label>
  );
}

function Publish() {
  const posts = useAtelier((s) => s.posts);
  const bio = useAtelier((s) => s.bio);
  const listingFa = useAtelier((s) => s.listingFa);
  const listingEn = useAtelier((s) => s.listingEn);
  const privacy = useAtelier((s) => s.privacy);
  const checks = useAtelier((s) => s.checks);
  const published = useAtelier((s) => s.appPublished);
  const setPublished = useAtelier((s) => s.setPublished);
  const setPostStatus = useAtelier((s) => s.setPostStatus);
  const toggleCheck = useAtelier((s) => s.toggleCheck);
  const [channel, setChannel] = useState<Channel | "all">("all");
  const visible = posts.filter((post) => channel === "all" || post.channel === channel);
  const pack = visible.map((post) => `${post.day} · ${post.kind} · ${post.title}\n${post.body}`).join("\n\n———\n\n");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-3xl">نشر</h2>
        <p className="mt-2 text-sm text-pretty text-mute">
          بستهٔ کپی برای اینستا و ایکس همین پایین است. ارسال واقعی تلگرام فقط از چرخهٔ تأییدشده انجام می‌شود.
        </p>
      </div>
      <DirtyBanner />
      <Pipeline />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl">وضعیت اپ</h3>
          <p className="text-sm text-mute">فقط وقتی واقعاً بالا آمد این را روشن کن.</p>
        </div>
        <button
          type="button"
          aria-pressed={published}
          onClick={() => setPublished(!published)}
          className={`min-h-11 rounded-full px-4 ${published ? "bg-brass text-ink" : "border border-clay text-clay"}`}
        >
          {published ? "منتشر شد" : "هنوز نه"}
        </button>
      </Card>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-xl">بیو</h3>
          <CopyButton text={bio} />
        </div>
        <pre className="mt-3 whitespace-pre-wrap text-sm">{bio}</pre>
      </Card>
      <details className="rounded-card border border-line bg-surface p-4">
        <summary className="min-h-11 cursor-pointer">متن استور و حریم</summary>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <div className="mb-2 flex justify-end">
              <CopyButton text={listingFa} label="کپی فارسی" />
            </div>
            <pre className="whitespace-pre-wrap text-sm">{listingFa}</pre>
          </div>
          <div dir="ltr" className="text-left">
            <div className="mb-2">
              <CopyButton text={listingEn} label="Copy English" />
            </div>
            <pre className="whitespace-pre-wrap text-sm">{listingEn}</pre>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-mute">{privacy}</pre>
        </div>
      </details>
      <div className="flex gap-2 overflow-x-auto">
        <FilterChip label="همه" active={channel === "all"} onClick={() => setChannel("all")} />
        {(Object.keys(CHANNEL_LABEL) as Channel[]).map((item) => (
          <FilterChip
            key={item}
            label={CHANNEL_LABEL[item]}
            active={channel === item}
            onClick={() => setChannel(item)}
          />
        ))}
      </div>
      <CopyButton text={pack} label="کپی بستهٔ همین فیلتر" />
      <div className="flex flex-col gap-3">
        {visible.map((post) => (
          <Card key={post.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-mute">
                  {post.day} · {CHANNEL_LABEL[post.channel]} · {post.kind}
                </p>
                <h3 className="mt-1 text-xl">{post.title}</h3>
              </div>
              <div className="flex gap-2">
                <CopyButton text={post.body} />
                <button
                  type="button"
                  onClick={() => setPostStatus(post.id, post.status === "posted" ? "ready" : "posted")}
                  className={`min-h-11 rounded-full px-4 text-sm ${
                    post.status === "posted" ? "bg-brass text-ink" : "border border-line"
                  }`}
                >
                  {post.status === "posted" ? "منتشر کردم" : "هنوز نه"}
                </button>
              </div>
            </div>
            <pre className="mt-3 whitespace-pre-wrap text-sm text-pretty">{post.body}</pre>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="text-xl">چک‌لیست دست خودت</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {checks
            .filter((item) => !item.auto)
            .map((item) => (
              <li key={item.id}>
                <label className="flex min-h-11 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-5"
                    checked={item.done}
                    onChange={() => toggleCheck(item.id)}
                  />
                  <span>
                    <span className="block">{item.title}</span>
                    <span className="block text-sm text-pretty text-mute">{item.detail}</span>
                  </span>
                </label>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full px-4 ${active ? "bg-brass text-ink" : "border border-line"}`}
    >
      {label}
    </button>
  );
}

function Guide() {
  const log = useAtelier((s) => s.log);
  const note = useAtelier((s) => s.note);
  const setNote = useAtelier((s) => s.setNote);
  const compile = useAtelier((s) => s.compile);
  const reroll = useAtelier((s) => s.reroll);
  const setIntensity = useAtelier((s) => s.setIntensity);
  const pushLog = useAtelier((s) => s.pushLog);
  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<string[] | null>(null);

  async function run(kind: "all" | "reroll" | "blast" | "compile" | "blocked") {
    if (busy) return;
    setBusy(true);
    const steps =
      kind === "blocked"
        ? [BLOCKED_REPLY, "حالت انفجاری تمیز مسلح شد.", "متن کانال‌ها با همین خط بازنویسی شد."]
        : kind === "reroll"
          ? ["وزن لایه‌ها خوانده شد.", "هشت ترکیب بی‌تکرار چیده شد.", "کپشن اثرها نو شد."]
          : kind === "blast"
            ? ["شدت روی انفجاری رفت.", "هفت حلقه روشن شد.", "دستور ۴۸ساعته در تلگرام نشست."]
            : kind === "all"
              ? [
                  "هویت پیج و اپ قفل شد.",
                  "مجموعه از نو چیده شد.",
                  "موتور جذب انفجاری تمیز مسلح شد.",
                  "بستهٔ اینستا، تلگرام، ایکس و لندینگ نوشته شد.",
                ]
              : ["نام‌ها خوانده شد.", "بیو، استور و کپشن‌ها بازنویسی شد."];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLive([]);
    for (const step of steps) {
      if (!reduce) await new Promise((resolve) => window.setTimeout(resolve, 220));
      setLive((prev) => [...(prev ?? []), step]);
    }
    if (kind === "blast" || kind === "blocked" || kind === "all") setIntensity("blast");
    if (kind === "reroll" || kind === "all") reroll();
    else compile();
    pushLog(steps);
    setLive(null);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-3xl">دستیار</h2>
        <p className="mt-2 max-w-xl text-sm text-pretty text-mute">
          از صفر تا متن آماده را همین‌جا می‌چیند. پست را به اینستاگرام نمی‌فرستد و مینت را روی شبکه نمی‌زند؛
          هر دو را طوری تحویل می‌دهد که خودت در یک نشست انجامشان بدهی.
        </p>
      </div>
      <DirtyBanner />
      <label className="block">
        <span className="mb-1 block text-sm text-mute">زاویهٔ این هفته</span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="مثلاً: پشت‌صحنهٔ ساخت فانوس"
          className="min-h-11 w-full rounded-xl border border-line bg-raised px-3 text-cream"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className="min-h-11 rounded-full bg-brass px-4 text-ink disabled:opacity-50" onClick={() => void run("all")}>
          از صفر بچین
        </button>
        <button type="button" disabled={busy} className="min-h-11 rounded-full border border-line px-4 disabled:opacity-50" onClick={() => void run("reroll")}>
          مجموعهٔ تازه
        </button>
        <button type="button" disabled={busy} className="min-h-11 rounded-full border border-line px-4 disabled:opacity-50" onClick={() => void run("blast")}>
          جذب انفجاری
        </button>
        <button type="button" disabled={busy} className="min-h-11 rounded-full border border-line px-4 disabled:opacity-50" onClick={() => void run("compile")}>
          فقط متن‌ها
        </button>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const intent = assistantIntent(command);
          setCommand("");
          void run(intent);
        }}
      >
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="بگو چه بچیند"
          className="min-h-11 w-full rounded-xl border border-line bg-raised px-3 text-cream"
        />
        <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-brass px-5 text-ink disabled:opacity-50">
          اجرا
        </button>
      </form>
      {live ? (
        <Card>
          <ul className="flex flex-col gap-2 text-sm">
            {live.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Card>
        <h3 className="text-xl">رد کار</h3>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-pretty text-mute">
          {log.map((line, index) => (
            <li key={`${index}-${line.slice(0, 12)}`}>{line}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
