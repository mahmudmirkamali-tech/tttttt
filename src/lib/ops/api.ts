import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { claimAllowed, interpretTelegram, scrubSecret } from "@/lib/ops/publish";

const CHANNEL = z.enum(["telegram", "instagram"]);
const STAGE = z.enum(["new", "talking", "qualified", "won", "lost"]);
const SOURCE = z.enum(["manual", "telegram", "instagram", "campaign"]);
const FOLLOW = z.enum(["open", "waiting", "done"]);
const KIND = z.enum(["contact", "customer"]);
const ID = z.string().regex(/^[0-9a-f-]{36}$/i);

type Sql = Awaited<ReturnType<typeof import("@/lib/db").getSql>>;

async function db() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error("ورودی نامعتبر است");
  return result.data;
}

function piiBlock(text: string) {
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) return "ایمیل در CRM ذخیره نمی‌شود.";
  if (/(?:\+?\d[\d\s\-()]{8,}\d)/.test(text)) return "شماره تلفن در CRM ذخیره نمی‌شود.";
  return null;
}

function isDuplicate(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("23505") || /unique|duplicate/i.test(message);
}

function stamp(column: string) {
  return `to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
}

type ContentRow = {
  id: string;
  channel: "telegram" | "instagram";
  title: string;
  body: string;
  status: "draft" | "approved" | "sending" | "sent" | "failed";
  source: string;
  scheduled_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  telegram_message_id: string | null;
  error: string | null;
  created_at: string;
};

const CONTENT_SELECT = `
  id, channel, title, body, status, source,
  ${stamp("scheduled_at")} as scheduled_at,
  ${stamp("approved_at")} as approved_at,
  ${stamp("sent_at")} as sent_at,
  telegram_message_id, error,
  ${stamp("created_at")} as created_at
`;

async function recentSends(sql: Sql, userId: string) {
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from send_log
    where user_id = ${userId} and created_at > now() - interval '1 hour'
  `;
  return rows[0]?.n ?? 0;
}

async function recentAi(sql: Sql, userId: string) {
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from ai_calls
    where user_id = ${userId} and created_at > now() - interval '1 hour'
  `;
  return rows[0]?.n ?? 0;
}

async function recordFailure(sql: Sql, userId: string, id: string, error: string) {
  const rows = await sql<{ id: string }>`
    update content_items
    set status = 'failed', error = ${error}, updated_at = now()
    where id = ${id} and user_id = ${userId} and status in ('approved', 'sending')
    returning id
  `;
  if (!rows[0]) return;
  await sql`
    insert into send_log (id, content_id, user_id, ok, error)
    values (${crypto.randomUUID()}, ${id}, ${userId}, false, ${error})
  `;
}

async function deliver(sql: Sql, userId: string, id: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
  const existing = await sql<{ status: string; channel: string; telegram_message_id: string | null }>`
    select status, channel, telegram_message_id from content_items
    where id = ${id} and user_id = ${userId}
  `;
  const current = existing[0];
  if (!current || !claimAllowed(current.status, current.channel, current.telegram_message_id)) {
    return { ok: false as const, error: "فقط مورد تأییدشدهٔ تلگرام، بدون شناسهٔ پیام، ارسال می‌شود." };
  }
  if (!token || !chatId) {
    const error = "توکن ربات یا شناسهٔ چت روی سرور تنظیم نشده. ارسالی انجام نشد.";
    await recordFailure(sql, userId, id, error);
    return { ok: false as const, error };
  }
  if ((await recentSends(sql, userId)) >= 12) {
    const error = "سقف ۱۲ ارسال در ساعت پر شده.";
    await recordFailure(sql, userId, id, error);
    return { ok: false as const, error };
  }
  const claimed = await sql<{ id: string; body: string; title: string }>`
    update content_items
    set status = 'sending', updated_at = now(), error = null
    where id = ${id} and user_id = ${userId} and channel = 'telegram'
      and status = 'approved' and telegram_message_id is null
    returning id, body, title
  `;
  const row = claimed[0];
  if (!row) {
    return { ok: false as const, error: "ارسال تکراری رد شد. وضعیت دیگر «تأییدشده» نیست." };
  }
  const logId = crypto.randomUUID();
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: row.body.slice(0, 3500) }),
    });
    const payload = (await res.json()) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    };
    const verdict = interpretTelegram(res.status, payload);
    if (!verdict.ok) {
      const error = scrubSecret(verdict.error, token);
      await recordFailure(sql, userId, id, error);
      return { ok: false as const, error };
    }
    const messageId = verdict.messageId;
    await sql`
      update content_items
      set status = 'sent', telegram_message_id = ${messageId}, error = null,
          sent_at = now(), updated_at = now()
      where id = ${id} and user_id = ${userId} and status = 'sending'
    `;
    await sql`
      insert into send_log (id, content_id, user_id, ok, telegram_message_id)
      values (${logId}, ${id}, ${userId}, true, ${messageId})
    `;
    await sql`
      insert into crm_interactions (id, user_id, kind, summary)
      values (${crypto.randomUUID()}, ${userId}, 'telegram_sent', ${`ارسال شد: ${row.title}`.slice(0, 180)})
    `;
    return { ok: true as const, messageId };
  } catch (error) {
    const message = scrubSecret(error instanceof Error ? error.message : "خطای شبکه", token);
    await recordFailure(sql, userId, id, message);
    return { ok: false as const, error: message };
  }
}

async function chat(sql: Sql, userId: string, purpose: string, system: string, user: string) {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return { ok: false as const, error: "کلید AI روی سرور نیست. متن جعلی ساخته نشد." };
  if ((await recentAi(sql, userId)) >= 8) {
    return { ok: false as const, error: "سقف ۸ فراخوانی AI در ساعت پر شده." };
  }
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      max_tokens: 500,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) return { ok: false as const, error: `خطای AI: ${res.status}` };
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = body.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) return { ok: false as const, error: "مدل متنی برنگرداند." };
  await sql`
    insert into ai_calls (id, user_id, purpose, model, prompt_tokens, completion_tokens)
    values (
      ${crypto.randomUUID()},
      ${userId},
      ${purpose},
      'grok-4.5',
      ${body.usage?.prompt_tokens ?? null},
      ${body.usage?.completion_tokens ?? null}
    )
  `;
  return { ok: true as const, text };
}

export const opsStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async () => {
    const instagramToken = Boolean(process.env.INSTAGRAM_ACCESS_TOKEN?.trim());
    return {
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim()),
      instagram: false as const,
      instagramDetail: instagramToken
        ? "توکن Meta روی سرور هست، ولی انتشار بدون رسانهٔ عمومی و مجوز pages انجام نمی‌شود."
        : "توکن Meta روی سرور نیست. انتشار اینستاگرام خاموش است؛ فقط کپشن آماده می‌شود.",
      ai: Boolean(process.env.XAI_API_KEY?.trim()),
    };
  });

export const listContent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    return sql.query<ContentRow>(
      `select ${CONTENT_SELECT} from content_items where user_id = $1 order by created_at desc limit 40`,
      [context.userId],
    );
  });

const draftSchema = z.object({
  channel: CHANNEL,
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(3500),
});

export const createDraft = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(draftSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await db();
    const id = crypto.randomUUID();
    await sql`
      insert into content_items (id, user_id, channel, title, body, status, source)
      values (${id}, ${context.userId}, ${data.channel}, ${data.title}, ${data.body}, 'draft', 'manual')
    `;
    return { ok: true as const, id };
  });

const generateSchema = z.object({
  channel: CHANNEL,
  brief: z.string().trim().min(1).max(800),
});

export const generateDraft = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(generateSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await db();
    const voiceRows = await sql<{ voice: string }>`
      select voice from studio_voice where user_id = ${context.userId}
    `;
    const voice = voiceRows[0]?.voice?.trim() || "لحن آرام، دقیق، بدون وعدهٔ قیمت";
    const result = await chat(
      sql,
      context.userId,
      "draft",
      `تو سردبیر فارسی برند هستی. لحن: ${voice}. فقط خودِ متن قابل انتشار را بنویس. هشتگ زیاد نگذار. وعدهٔ سود، ربات و عدد جعلی ننویس.`,
      `کانال: ${data.channel}\nخواسته: ${data.brief}`,
    );
    if (!result.ok) return result;
    const id = crypto.randomUUID();
    const title = data.brief.slice(0, 80);
    await sql`
      insert into content_items (id, user_id, channel, title, body, status, source)
      values (${id}, ${context.userId}, ${data.channel}, ${title}, ${result.text.slice(0, 3500)}, 'draft', 'ai')
    `;
    return { ok: true as const, id };
  });

export const approveContent = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({ id: ID }), input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await db();
    const rows = await sql<{ id: string }>`
      update content_items
      set status = 'approved', approved_at = now(), updated_at = now(), error = null
      where id = ${data.id} and user_id = ${context.userId} and status = 'draft'
      returning id
    `;
    if (!rows[0]) return { ok: false as const, error: "فقط پیش‌نویس را می‌شود تأیید کرد." };
    return { ok: true as const };
  });

export const retryContent = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({ id: ID }), input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await db();
    const rows = await sql<{ id: string }>`
      update content_items
      set status = 'approved', error = null, updated_at = now()
      where id = ${data.id} and user_id = ${context.userId}
        and status = 'failed' and channel = 'telegram' and telegram_message_id is null
      returning id
    `;
    if (!rows[0]) return { ok: false as const, error: "فقط ارسال ناموفقِ بدون شناسهٔ پیام به تأیید برمی‌گردد." };
    return { ok: true as const };
  });

export const scheduleContent = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({ id: ID, at: z.string().datetime({ offset: true }) }), input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await db();
    const rows = await sql<{ id: string }>`
      update content_items
      set scheduled_at = ${data.at}::timestamptz, updated_at = now()
      where id = ${data.id} and user_id = ${context.userId} and status in ('draft', 'approved')
      returning id
    `;
    if (!rows[0]) return { ok: false as const, error: "زمان فقط روی پیش‌نویس یا تأییدشده می‌نشیند." };
    return { ok: true as const };
  });

export const sendTelegram = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({ id: ID }), input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => deliver(await db(), context.userId, data.id));

export const dispatchDue = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const due = await sql<{ id: string }>`
      select id from content_items
      where user_id = ${context.userId} and channel = 'telegram' and status = 'approved'
        and telegram_message_id is null
        and scheduled_at is not null and scheduled_at <= now()
      order by scheduled_at asc
      limit 5
    `;
    const results: { id: string; ok: boolean; error?: string; messageId?: string }[] = [];
    for (const row of due) {
      const result = await deliver(sql, context.userId, row.id);
      results.push({ id: row.id, ...result });
    }
    return { count: due.length, results };
  });

export const releaseStuck = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const rows = await sql<{ id: string }>`
      update content_items
      set status = 'failed', updated_at = now(),
          error = 'ارسال ناتمام ماند. اگر پیام در کانال هست، دوباره نفرست.'
      where user_id = ${context.userId} and status = 'sending'
        and updated_at < now() - interval '10 minutes'
      returning id
    `;
    return { released: rows.length };
  });

export const kpiSnapshot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const userId = context.userId;
    const content = await sql<{
      created: number;
      drafts: number;
      approved: number;
      sent: number;
      failed: number;
    }>`
      select
        count(*)::int as created,
        count(*) filter (where status = 'draft')::int as drafts,
        count(*) filter (where approved_at is not null)::int as approved,
        count(*) filter (where status = 'sent')::int as sent,
        count(*) filter (where status = 'failed')::int as failed
      from content_items
      where user_id = ${userId}
    `;
    const leads = await sql<{ leads: number; won: number }>`
      select
        count(*)::int as leads,
        count(*) filter (where stage = 'won')::int as won
      from crm_leads
      where user_id = ${userId}
    `;
    const customers = await sql<{ n: number }>`
      select count(*)::int as n from crm_contacts
      where user_id = ${userId} and kind = 'customer'
    `;
    const ai = await sql<{ calls: number; tokens: number | null }>`
      select
        count(*)::int as calls,
        case when count(prompt_tokens) = 0 then null
             else coalesce(sum(prompt_tokens), 0)::int + coalesce(sum(completion_tokens), 0)::int
        end as tokens
      from ai_calls
      where user_id = ${userId}
    `;
    const errors = await sql.query<{ error: string; created_at: string }>(
      `select error, ${stamp("created_at")} as created_at
       from send_log
       where user_id = $1 and ok = false and error is not null
       order by created_at desc
       limit 8`,
      [userId],
    );
    const activity = await sql<{ day: string; n: number }>`
      select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day, count(*)::int as n
      from content_items
      where user_id = ${userId}
      group by 1
      order by 1 desc
      limit 14
    `;
    const row = content[0] ?? { created: 0, drafts: 0, approved: 0, sent: 0, failed: 0 };
    const lead = leads[0] ?? { leads: 0, won: 0 };
    const usage = ai[0] ?? { calls: 0, tokens: null };
    const attempts = row.sent + row.failed;
    return {
      generated: row.created,
      drafts: row.drafts,
      approved: row.approved,
      sent: row.sent,
      failed: row.failed,
      successRate: attempts === 0 ? null : row.sent / attempts,
      leads: lead.leads,
      won: lead.won,
      customers: customers[0]?.n ?? 0,
      conversion: lead.leads === 0 ? null : lead.won / lead.leads,
      aiCalls: usage.calls,
      aiTokens: usage.tokens,
      aiCost: null,
      aiCostNote: "هزینهٔ دلاری ذخیره نمی‌شود. فقط تعداد فراخوانی و توکن واقعی است.",
      instagramInsights: null,
      telegramViews: null,
      errors,
      activity,
    };
  });

export const suggestFromResults = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const rows = await sql<{ title: string; status: string; error: string | null }>`
      select title, status, error from content_items
      where user_id = ${context.userId} and status in ('sent', 'failed')
      order by updated_at desc
      limit 8
    `;
    if (rows.length === 0) {
      return { ok: false as const, error: "هنوز ارسال واقعی نداریم. پیشنهادی از حدس ساخته نشد." };
    }
    const voiceRows = await sql<{ voice: string }>`
      select voice from studio_voice where user_id = ${context.userId}
    `;
    const facts = rows
      .map((row) => `${row.status} | ${row.title}${row.error ? ` | ${row.error}` : ""}`)
      .join("\n");
    const result = await chat(
      sql,
      context.userId,
      "suggest",
      "با نتیجهٔ واقعی ارسال‌ها یک پیشنهاد کوتاه فارسی بده. آمار نساز.",
      `لحن: ${voiceRows[0]?.voice || "آرام"}\nنتایج:\n${facts}`,
    );
    if (!result.ok) return result;
    return { ok: true as const, text: result.text };
  });

const voiceSchema = z.object({ voice: z.string().trim().max(400) });

export const saveVoice = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(voiceSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await db();
    await sql`
      insert into studio_voice (user_id, voice) values (${context.userId}, ${data.voice})
      on conflict (user_id) do update set voice = excluded.voice
    `;
    return { ok: true as const };
  });

export const readVoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const rows = await sql<{ voice: string }>`
      select voice from studio_voice where user_id = ${context.userId}
    `;
    return { voice: rows[0]?.voice ?? "" };
  });

const campaignSchema = z.object({
  title: z.string().trim().min(1).max(80),
  channel: CHANNEL,
});

export const addCampaign = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(campaignSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const blocked = piiBlock(data.title);
    if (blocked) return { ok: false as const, error: blocked };
    const sql = await db();
    await sql`
      insert into crm_campaigns (id, user_id, title, channel, status)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.title}, ${data.channel}, 'active')
    `;
    return { ok: true as const };
  });

const leadSchema = z.object({
  label: z.string().trim().min(1).max(80),
  stage: STAGE,
  source: SOURCE,
  tags: z.string().trim().max(80).default(""),
});

export const addLead = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(leadSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const blocked = piiBlock(`${data.label} ${data.tags}`);
    if (blocked) return { ok: false as const, error: blocked };
    const sql = await db();
    try {
      await sql`
        insert into crm_leads (id, user_id, label, stage, source, tags, follow_up)
        values (${crypto.randomUUID()}, ${context.userId}, ${data.label}, ${data.stage}, ${data.source}, ${data.tags}, 'open')
      `;
    } catch (error) {
      if (isDuplicate(error)) return { ok: false as const, error: "این سرنخ قبلاً ثبت شده." };
      throw error;
    }
    return { ok: true as const };
  });

export const setFollowUp = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({ id: ID, followUp: FOLLOW }), input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await db();
    const rows = await sql<{ id: string }>`
      update crm_leads set follow_up = ${data.followUp}
      where id = ${data.id} and user_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) return { ok: false as const, error: "سرنخ پیدا نشد." };
    return { ok: true as const };
  });

export const setLeadStage = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({ id: ID, stage: STAGE }), input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await db();
    const rows = await sql<{ id: string }>`
      update crm_leads set stage = ${data.stage}
      where id = ${data.id} and user_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) return { ok: false as const, error: "سرنخ پیدا نشد." };
    return { ok: true as const };
  });

export const setOpportunityStage = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({ id: ID, stage: STAGE }), input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await db();
    const rows = await sql<{ id: string }>`
      update crm_opportunities set stage = ${data.stage}
      where id = ${data.id} and user_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) return { ok: false as const, error: "فرصت پیدا نشد." };
    return { ok: true as const };
  });

const contactSchema = z.object({
  label: z.string().trim().min(1).max(80),
  kind: KIND,
  source: SOURCE,
});

export const addContact = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(contactSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const blocked = piiBlock(data.label);
    if (blocked) return { ok: false as const, error: blocked };
    const sql = await db();
    try {
      await sql`
        insert into crm_contacts (id, user_id, label, kind, source)
        values (${crypto.randomUUID()}, ${context.userId}, ${data.label}, ${data.kind}, ${data.source})
      `;
    } catch (error) {
      if (isDuplicate(error)) return { ok: false as const, error: "این مخاطب قبلاً ثبت شده." };
      throw error;
    }
    return { ok: true as const };
  });

const opportunitySchema = z.object({
  title: z.string().trim().min(1).max(80),
  stage: STAGE,
});

export const addOpportunity = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(opportunitySchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const blocked = piiBlock(data.title);
    if (blocked) return { ok: false as const, error: blocked };
    const sql = await db();
    await sql`
      insert into crm_opportunities (id, user_id, title, stage)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.title}, ${data.stage})
    `;
    return { ok: true as const };
  });

const taskSchema = z.object({ title: z.string().trim().min(1).max(120) });

export const addTask = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(taskSchema, input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const blocked = piiBlock(data.title);
    if (blocked) return { ok: false as const, error: blocked };
    const sql = await db();
    await sql`
      insert into crm_tasks (id, user_id, title) values (${crypto.randomUUID()}, ${context.userId}, ${data.title})
    `;
    return { ok: true as const };
  });

export const toggleTask = createServerFn({ method: "POST" })
  .validator((input: unknown) => parse(z.object({ id: ID }), input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await db();
    await sql`
      update crm_tasks set done = not done where id = ${data.id} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const listCrm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const userId = context.userId;
    const [campaigns, leads, tasks, interactions, contacts, opportunities] = await Promise.all([
      sql.query<{ id: string; title: string; channel: string; status: string }>(
        "select id, title, channel, status from crm_campaigns where user_id = $1 order by created_at desc limit 20",
        [userId],
      ),
      sql.query<{ id: string; label: string; stage: string; source: string; follow_up: string; tags: string }>(
        "select id, label, stage, source, follow_up, tags from crm_leads where user_id = $1 order by created_at desc limit 30",
        [userId],
      ),
      sql.query<{ id: string; title: string; done: boolean }>(
        "select id, title, done from crm_tasks where user_id = $1 order by created_at desc limit 30",
        [userId],
      ),
      sql.query<{ id: string; kind: string; summary: string; created_at: string }>(
        `select id, kind, summary, ${stamp("created_at")} as created_at
         from crm_interactions where user_id = $1 order by created_at desc limit 20`,
        [userId],
      ),
      sql.query<{ id: string; label: string; kind: string; source: string }>(
        "select id, label, kind, source from crm_contacts where user_id = $1 order by created_at desc limit 30",
        [userId],
      ),
      sql.query<{ id: string; title: string; stage: string }>(
        "select id, title, stage from crm_opportunities where user_id = $1 order by created_at desc limit 20",
        [userId],
      ),
    ]);
    return { campaigns, leads, tasks, interactions, contacts, opportunities };
  });

