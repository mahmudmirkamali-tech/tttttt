import { useEffect, useState, type ReactNode } from "react";
import { SignInGate } from "@/lib/auth/gates";
import { faNum } from "@/lib/atelier/model";
import {
  addCampaign,
  addContact,
  addLead,
  addOpportunity,
  addTask,
  approveContent,
  createDraft,
  dispatchDue,
  generateDraft,
  kpiSnapshot,
  listContent,
  listCrm,
  opsStatus,
  readVoice,
  releaseStuck,
  retryContent,
  saveVoice,
  scheduleContent,
  sendTelegram,
  setFollowUp,
  setLeadStage,
  setOpportunityStage,
  suggestFromResults,
  toggleTask,
} from "@/lib/ops/api";
import { INSTAGRAM_REQUIREMENTS } from "@/lib/ops/publish";
import { Card, CopyButton } from "@/components/atelier/ui";

type Content = Awaited<ReturnType<typeof listContent>>[number];
type Kpi = Awaited<ReturnType<typeof kpiSnapshot>>;
type Crm = Awaited<ReturnType<typeof listCrm>>;

function Gate({ children, hint }: { children: ReactNode; hint: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) {
    return (
      <Card>
        <p className="text-sm text-mute">{hint}</p>
      </Card>
    );
  }
  return (
    <SignInGate
      fallback={
        <Card>
          <p className="text-sm text-pretty text-mute">{hint}</p>
          <a href="/login" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-brass px-4 text-ink">
            ورود
          </a>
        </Card>
      }
    >
      {children}
    </SignInGate>
  );
}

function noteOf(error: unknown) {
  return error instanceof Error ? error.message : "عملیات انجام نشد";
}

const STATUS_FA: Record<Content["status"], string> = {
  draft: "پیش‌نویس",
  approved: "تأییدشده",
  sending: "در حال ارسال",
  sent: "ارسال شد",
  failed: "ناموفق",
};

const STAGES = ["new", "talking", "qualified", "won", "lost"] as const;
const STAGE_FA: Record<(typeof STAGES)[number], string> = {
  new: "تازه",
  talking: "در گفتگو",
  qualified: "واجد",
  won: "برد",
  lost: "از دست رفت",
};

export function RealKpi() {
  return (
    <Gate hint="عددهای این کارت از دیتابیس است، نه از فرمول فالوور. برای دیدنش وارد شو.">
      <KpiBody />
    </Gate>
  );
}

function KpiBody() {
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    kpiSnapshot()
      .then((row) => {
        if (live) setKpi(row);
      })
      .catch((reason: unknown) => {
        if (live) setError(noteOf(reason));
      });
    return () => {
      live = false;
    };
  }, []);
  if (error) return <Card><p className="text-sm text-clay">{error}</p></Card>;
  if (!kpi) return <Card><p className="text-sm text-mute">در حال خواندن رکوردها…</p></Card>;
  const rate = kpi.successRate == null ? "هنوز ارسال نشده" : `${faNum(Math.round(kpi.successRate * 100))}٪`;
  const conversion = kpi.conversion == null ? "سرنخی نیست" : `${faNum(Math.round(kpi.conversion * 100))}٪`;
  return (
    <Card>
      <h2 className="text-2xl">سنجش واقعی</h2>
      <p className="mt-1 text-sm text-mute">از رکورد ذخیره‌شده. بازدید اینستاگرام و تلگرام این‌جا عدد ندارد.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="ساخته‌شده" value={faNum(kpi.generated)} />
        <Metric label="پیش‌نویس" value={faNum(kpi.drafts)} />
        <Metric label="تأییدشده" value={faNum(kpi.approved)} />
        <Metric label="ارسال موفق" value={faNum(kpi.sent)} />
        <Metric label="ناموفق" value={faNum(kpi.failed)} />
        <Metric label="نرخ موفقیت" value={rate} />
        <Metric label="سرنخ" value={faNum(kpi.leads)} />
        <Metric label="تبدیل" value={conversion} />
      </div>
      <p className="mt-3 text-sm text-mute">
        مشتری ثبت‌شده {faNum(kpi.customers)} · فراخوانی AI {faNum(kpi.aiCalls)}
        {kpi.aiTokens == null ? "" : ` · توکن ${faNum(kpi.aiTokens)}`}
      </p>
      <p className="mt-1 text-sm text-faint">{kpi.aiCostNote}</p>
      {kpi.activity.length > 0 ? (
        <p className="mt-2 text-sm text-mute">
          فعالیت: {kpi.activity.map((day) => `${day.day} (${faNum(day.n)})`).join(" · ")}
        </p>
      ) : null}
      {kpi.errors.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1 text-sm text-clay">
          {kpi.errors.map((item) => (
            <li key={`${item.created_at}-${item.error}`}>{item.error}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-mute">{label}</p>
      <p className="font-mark text-2xl tabular-nums">{value}</p>
    </div>
  );
}

export function Pipeline() {
  return (
    <Gate hint="انتشار تلگرام فقط بعد از تأیید تو، و فقط از سرور. برای این چرخه وارد شو.">
      <PipelineBody />
    </Gate>
  );
}

function PipelineBody() {
  const [rows, setRows] = useState<Content[]>([]);
  const [status, setStatus] = useState<{ telegram: boolean; ai: boolean; instagramDetail: string } | null>(null);
  const [brief, setBrief] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<"telegram" | "instagram">("telegram");
  const [note, setNote] = useState("");
  const [when, setWhen] = useState("");
  const [voice, setVoice] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [list, flags] = await Promise.all([listContent(), opsStatus()]);
    setRows(list);
    setStatus(flags);
  }

  useEffect(() => {
    let live = true;
    Promise.all([listContent(), opsStatus(), readVoice()])
      .then(([list, flags, saved]) => {
        if (!live) return;
        setRows(list);
        setStatus(flags);
        setVoice(saved.voice);
      })
      .catch((reason: unknown) => {
        if (live) setNote(noteOf(reason));
      });
    return () => {
      live = false;
    };
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setNote("");
    try {
      const result = (await action()) as {
        ok?: boolean;
        error?: string;
        messageId?: string;
        text?: string;
      };
      if (result && result.ok === false && result.error) setNote(result.error);
      else if (result && result.messageId) setNote(`تلگرام شناسهٔ ${result.messageId} را برگرداند.`);
      else if (result && result.text) setNote(result.text);
      await reload();
    } catch (reason) {
      setNote(noteOf(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="text-2xl">چرخهٔ انتشار</h2>
        <p className="mt-1 text-sm text-pretty text-mute">
          هدف را بنویس، پیش‌نویس ذخیره می‌شود، خودت تأیید می‌کنی، بعد سرور به تلگرام می‌فرستد.
          {status ? ` ربات: ${status.telegram ? "آماده" : "تنظیم نشده"}. مدل: ${status.ai ? "وصل" : "خاموش"}.` : ""}
        </p>
        {status ? <p className="mt-2 text-sm text-pretty text-mute">{status.instagramDetail}</p> : null}
        <label className="mt-4 block">
          <span className="mb-1 block text-sm text-mute">لحن مدل</span>
          <input
            value={voice}
            maxLength={400}
            onChange={(event) => setVoice(event.target.value)}
            placeholder="آرام، دقیق، بدون وعدهٔ قیمت"
            className="min-h-11 w-full rounded-xl border border-line bg-raised px-3 text-cream"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="min-h-11 rounded-full border border-line px-4 disabled:opacity-50"
            onClick={() =>
              void run(async () => {
                const saved = await saveVoice({ data: { voice } });
                return saved.ok ? { ok: true as const, text: "لحن ذخیره شد." } : saved;
              })
            }
          >
            ذخیرهٔ لحن
          </button>
          <button
            type="button"
            disabled={busy}
            className="min-h-11 rounded-full border border-line px-4 disabled:opacity-50"
            onClick={() => void run(() => suggestFromResults())}
          >
            پیشنهاد از نتیجه‌ها
          </button>
        </div>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm text-mute">هدف محتوا</span>
          <textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            className="min-h-24 w-full rounded-xl border border-line bg-raised px-3 py-2 text-cream"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || brief.trim().length === 0}
            className="min-h-11 rounded-full bg-brass px-4 text-ink disabled:opacity-50"
            onClick={() => void run(() => generateDraft({ data: { channel, brief } }))}
          >
            تولید و ذخیره
          </button>
          <button
            type="button"
            className={`min-h-11 rounded-full px-4 ${channel === "telegram" ? "bg-brass text-ink" : "border border-line"}`}
            onClick={() => setChannel("telegram")}
          >
            تلگرام
          </button>
          <button
            type="button"
            className={`min-h-11 rounded-full px-4 ${channel === "instagram" ? "bg-brass text-ink" : "border border-line"}`}
            onClick={() => setChannel("instagram")}
          >
            اینستاگرام
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="عنوان دستی"
            className="min-h-11 rounded-xl border border-line bg-raised px-3 text-cream"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="متن دستی، اگر مدل را نمی‌خواهی"
            className="min-h-24 rounded-xl border border-line bg-raised px-3 py-2 text-cream"
          />
          <button
            type="button"
            disabled={busy || title.trim().length === 0 || body.trim().length === 0}
            className="min-h-11 w-fit rounded-full border border-line px-4 disabled:opacity-50"
            onClick={() => void run(() => createDraft({ data: { channel, title, body } }))}
          >
            ذخیرهٔ پیش‌نویس دستی
          </button>
        </div>
        {note ? <p className="mt-3 text-sm text-pretty text-brass">{note}</p> : null}
      </Card>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id}>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl">{row.title}</h3>
                <span className="text-sm text-brass">
                  {row.channel === "telegram" ? "تلگرام" : "اینستاگرام"} · {STATUS_FA[row.status]}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-pretty text-cream">{row.body}</p>
              {row.error ? <p className="mt-2 text-sm text-clay">{row.error}</p> : null}
              {row.telegram_message_id ? (
                <p className="mt-2 text-sm text-mute">شناسهٔ پیام: {row.telegram_message_id}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {row.status === "draft" ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-11 rounded-full bg-brass px-4 text-ink"
                    onClick={() => void run(() => approveContent({ data: { id: row.id } }))}
                  >
                    تأیید می‌کنم
                  </button>
                ) : null}
                {row.status === "approved" && row.channel === "telegram" ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      className="min-h-11 rounded-full bg-brass px-4 text-ink"
                      onClick={() => void run(() => sendTelegram({ data: { id: row.id } }))}
                    >
                      ارسال به تلگرام
                    </button>
                    <input
                      type="datetime-local"
                      value={when}
                      onChange={(event) => setWhen(event.target.value)}
                      className="min-h-11 rounded-xl border border-line bg-raised px-3 text-cream"
                    />
                    <button
                      type="button"
                      disabled={busy || when.length === 0}
                      className="min-h-11 rounded-full border border-line px-4 disabled:opacity-50"
                      onClick={() => {
                        const at = new Date(when).toISOString();
                        void run(() => scheduleContent({ data: { id: row.id, at } }));
                      }}
                    >
                      زمان‌بندی
                    </button>
                  </>
                ) : null}
                {row.status === "failed" && row.channel === "telegram" && !row.telegram_message_id ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-11 rounded-full border border-line px-4"
                    onClick={() => void run(() => retryContent({ data: { id: row.id } }))}
                  >
                    بازگشت به تأیید
                  </button>
                ) : null}
                <CopyButton text={row.body} label="کپی متن" />
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Card>
        <h3 className="text-xl">نوبت‌های سررسید</h3>
        <p className="mt-1 text-sm text-mute">فقط موارد تأییدشدهٔ تلگرام که زمان‌شان گذشته. بدون تأیید ارسال نمی‌شود.</p>
        <button
          type="button"
          disabled={busy}
          className="mt-3 min-h-11 rounded-full border border-line px-4"
          onClick={() => void run(() => dispatchDue())}
        >
          ارسال سررسیدها
        </button>
        <button
          type="button"
          disabled={busy}
          className="mt-3 me-2 min-h-11 rounded-full border border-line px-4 disabled:opacity-50"
          onClick={() =>
            void run(async () => {
              const result = await releaseStuck();
              const text =
                result.released > 0
                  ? `${faNum(result.released)} ارسال ناتمام به ناموفق برگشت.`
                  : "ارسال ناتمامی نبود.";
              return { ok: true as const, text };
            })
          }
        >
          آزاد کردن گیرکرده‌ها
        </button>
      </Card>
      <Card>
        <h3 className="text-xl">اینستاگرام، فعلاً فقط آماده‌سازی</h3>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-mute">
          {INSTAGRAM_REQUIREMENTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function CrmBoard() {
  return (
    <Gate hint="مخاطب، سرنخ و کمپین فقط با چیزی که خودت وارد می‌کنی ذخیره می‌شود.">
      <CrmBody />
    </Gate>
  );
}

function CrmBody() {
  const [crm, setCrm] = useState<Crm | null>(null);
  const [label, setLabel] = useState("");
  const [task, setTask] = useState("");
  const [campaign, setCampaign] = useState("");
  const [deal, setDeal] = useState("");
  const [note, setNote] = useState("");

  async function reload() {
    setCrm(await listCrm());
  }

  useEffect(() => {
    let live = true;
    reload().catch((reason: unknown) => {
      if (live) setNote(noteOf(reason));
    });
    return () => {
      live = false;
    };
  }, []);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setNote("");
    try {
      const result = await action();
      if (!result.ok && result.error) setNote(result.error);
      else await reload();
    } catch (reason) {
      setNote(noteOf(reason));
    }
  }

  return (
    <Card>
      <h2 className="text-2xl">دفتر مخاطب</h2>
      <p className="mt-1 text-sm text-mute">ایمیل و شماره ذخیره نمی‌شود. نام تکراری رد می‌شود.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-mute">مخاطب یا مشتری</span>
          <input value={label} onChange={(event) => setLabel(event.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-raised px-3" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-mute">کمپین</span>
          <input value={campaign} onChange={(event) => setCampaign(event.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-raised px-3" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-mute">فرصت فروش</span>
          <input value={deal} onChange={(event) => setDeal(event.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-raised px-3" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-mute">وظیفه</span>
          <input value={task} onChange={(event) => setTask(event.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-raised px-3" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-full bg-brass px-4 text-ink" onClick={() => void run(() => addContact({ data: { label, kind: "contact", source: "manual" } }))}>مخاطب</button>
        <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => void run(() => addContact({ data: { label, kind: "customer", source: "manual" } }))}>مشتری</button>
        <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => void run(() => addLead({ data: { label, stage: "new", source: "manual", tags: "" } }))}>سرنخ</button>
        <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => void run(() => addCampaign({ data: { title: campaign, channel: "telegram" } }))}>کمپین</button>
        <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => void run(() => addOpportunity({ data: { title: deal, stage: "new" } }))}>فرصت</button>
        <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => void run(() => addTask({ data: { title: task } }))}>وظیفه</button>
      </div>
      {note ? <p className="mt-3 text-sm text-clay">{note}</p> : null}
      {crm ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <List title="مخاطب‌ها" items={crm.contacts.map((item) => `${item.label} · ${item.kind === "customer" ? "مشتری" : "مخاطب"}`)} />
          <div>
            <h3 className="text-lg">سرنخ‌ها</h3>
            {crm.leads.length === 0 ? <p className="mt-2 text-sm text-mute">خالی</p> : (
              <ul className="mt-2 flex flex-col gap-3">
                {crm.leads.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2">
                    <span className="text-sm">{item.label}</span>
                    <select
                      value={item.stage}
                      aria-label={`مرحلهٔ ${item.label}`}
                      onChange={(event) => {
                        const stage = event.target.value as (typeof STAGES)[number];
                        void run(() => setLeadStage({ data: { id: item.id, stage } }));
                      }}
                      className="min-h-11 rounded-xl border border-line bg-raised px-3 text-cream"
                    >
                      {STAGES.map((stage) => (
                        <option key={stage} value={stage}>{STAGE_FA[stage]}</option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      {(["open", "waiting", "done"] as const).map((follow) => (
                        <button
                          key={follow}
                          type="button"
                          className={`min-h-11 rounded-full px-3 text-sm ${item.follow_up === follow ? "bg-brass text-ink" : "border border-line"}`}
                          onClick={() => void run(() => setFollowUp({ data: { id: item.id, followUp: follow } }))}
                        >
                          {follow === "open" ? "باز" : follow === "waiting" ? "منتظر" : "بسته"}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-lg">فرصت‌ها</h3>
            {crm.opportunities.length === 0 ? <p className="mt-2 text-sm text-mute">خالی</p> : (
              <ul className="mt-2 flex flex-col gap-3">
                {crm.opportunities.map((item) => (
                  <li key={item.id}>
                    <span className="text-sm">{item.title}</span>
                    <select
                      value={item.stage}
                      aria-label={`مرحلهٔ ${item.title}`}
                      onChange={(event) => {
                        const stage = event.target.value as (typeof STAGES)[number];
                        void run(() => setOpportunityStage({ data: { id: item.id, stage } }));
                      }}
                      className="mt-1 min-h-11 w-full rounded-xl border border-line bg-raised px-3 text-cream"
                    >
                      {STAGES.map((stage) => (
                        <option key={stage} value={stage}>{STAGE_FA[stage]}</option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <List title="کمپین‌ها" items={crm.campaigns.map((item) => item.title)} />
          <div>
            <h3 className="text-lg">وظایف</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {crm.tasks.map((item) => (
                <li key={item.id}>
                  <button type="button" className="min-h-11 text-start text-sm" onClick={() => void run(async () => { await toggleTask({ data: { id: item.id } }); return { ok: true }; })}>
                    {item.done ? "انجام شد" : "باز"} · {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <List title="تعامل‌ها" items={crm.interactions.map((item) => item.summary)} />
        </div>
      ) : null}
    </Card>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-lg">{title}</h3>
      {items.length === 0 ? <p className="mt-2 text-sm text-mute">خالی</p> : (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
