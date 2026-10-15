import { i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { a as scrubSecret, i as interpretTelegram, n as authMiddleware, r as claimAllowed } from "./publish-Be_cCY0W.mjs";
import { cn as _enum, gn as object, yn as string } from "../_libs/@better-auth/core+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-BPu5NHUP.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var CHANNEL = _enum(["telegram", "instagram"]);
var STAGE = _enum([
	"new",
	"talking",
	"qualified",
	"won",
	"lost"
]);
var SOURCE = _enum([
	"manual",
	"telegram",
	"instagram",
	"campaign"
]);
var FOLLOW = _enum([
	"open",
	"waiting",
	"done"
]);
var KIND = _enum(["contact", "customer"]);
var ID = string().regex(/^[0-9a-f-]{36}$/i);
async function db() {
	const { getSql } = await import("./db-Ceqf34Dm.mjs").then((n) => n.t).then((n) => n.t);
	return getSql();
}
function parse(schema, input) {
	const result = schema.safeParse(input);
	if (!result.success) throw new Error("ورودی نامعتبر است");
	return result.data;
}
function piiBlock(text) {
	if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) return "ایمیل در CRM ذخیره نمی‌شود.";
	if (/(?:\+?\d[\d\s\-()]{8,}\d)/.test(text)) return "شماره تلفن در CRM ذخیره نمی‌شود.";
	return null;
}
function isDuplicate(error) {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes("23505") || /unique|duplicate/i.test(message);
}
function stamp(column) {
	return `to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
}
var CONTENT_SELECT = `
  id, channel, title, body, status, source,
  ${stamp("scheduled_at")} as scheduled_at,
  ${stamp("approved_at")} as approved_at,
  ${stamp("sent_at")} as sent_at,
  telegram_message_id, error,
  ${stamp("created_at")} as created_at
`;
async function recentSends(sql, userId) {
	return (await sql`
    select count(*)::int as n from send_log
    where user_id = ${userId} and created_at > now() - interval '1 hour'
  `)[0]?.n ?? 0;
}
async function recentAi(sql, userId) {
	return (await sql`
    select count(*)::int as n from ai_calls
    where user_id = ${userId} and created_at > now() - interval '1 hour'
  `)[0]?.n ?? 0;
}
async function recordFailure(sql, userId, id, error) {
	if (!(await sql`
    update content_items
    set status = 'failed', error = ${error}, updated_at = now()
    where id = ${id} and user_id = ${userId} and status in ('approved', 'sending')
    returning id
  `)[0]) return;
	await sql`
    insert into send_log (id, content_id, user_id, ok, error)
    values (${crypto.randomUUID()}, ${id}, ${userId}, false, ${error})
  `;
}
async function deliver(sql, userId, id) {
	const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
	const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
	const current = (await sql`
    select status, channel, telegram_message_id from content_items
    where id = ${id} and user_id = ${userId}
  `)[0];
	if (!current || !claimAllowed(current.status, current.channel, current.telegram_message_id)) return {
		ok: false,
		error: "فقط مورد تأییدشدهٔ تلگرام، بدون شناسهٔ پیام، ارسال می‌شود."
	};
	if (!token || !chatId) {
		const error = "توکن ربات یا شناسهٔ چت روی سرور تنظیم نشده. ارسالی انجام نشد.";
		await recordFailure(sql, userId, id, error);
		return {
			ok: false,
			error
		};
	}
	if (await recentSends(sql, userId) >= 12) {
		const error = "سقف ۱۲ ارسال در ساعت پر شده.";
		await recordFailure(sql, userId, id, error);
		return {
			ok: false,
			error
		};
	}
	const row = (await sql`
    update content_items
    set status = 'sending', updated_at = now(), error = null
    where id = ${id} and user_id = ${userId} and channel = 'telegram'
      and status = 'approved' and telegram_message_id is null
    returning id, body, title
  `)[0];
	if (!row) return {
		ok: false,
		error: "ارسال تکراری رد شد. وضعیت دیگر «تأییدشده» نیست."
	};
	const logId = crypto.randomUUID();
	try {
		const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				text: row.body.slice(0, 3500)
			})
		});
		const payload = await res.json();
		const verdict = interpretTelegram(res.status, payload);
		if (!verdict.ok) {
			const error = scrubSecret(verdict.error, token);
			await recordFailure(sql, userId, id, error);
			return {
				ok: false,
				error
			};
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
		return {
			ok: true,
			messageId
		};
	} catch (error) {
		const message = scrubSecret(error instanceof Error ? error.message : "خطای شبکه", token);
		await recordFailure(sql, userId, id, message);
		return {
			ok: false,
			error: message
		};
	}
}
async function chat(sql, userId, purpose, system, user) {
	const apiKey = process.env.XAI_API_KEY?.trim();
	if (!apiKey) return {
		ok: false,
		error: "کلید AI روی سرور نیست. متن جعلی ساخته نشد."
	};
	if (await recentAi(sql, userId) >= 8) return {
		ok: false,
		error: "سقف ۸ فراخوانی AI در ساعت پر شده."
	};
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			max_tokens: 500,
			messages: [{
				role: "system",
				content: system
			}, {
				role: "user",
				content: user
			}]
		})
	});
	if (!res.ok) return {
		ok: false,
		error: `خطای AI: ${res.status}`
	};
	const body = await res.json();
	const text = body.choices?.[0]?.message?.content?.trim() ?? "";
	if (!text) return {
		ok: false,
		error: "مدل متنی برنگرداند."
	};
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
	return {
		ok: true,
		text
	};
}
var opsStatus_createServerFn_handler = createServerRpc({
	id: "1ae5c0546fad35995eba0abf2d3507022e5357726f39c53e9f0066093699db92",
	name: "opsStatus",
	filename: "src/lib/ops/api.ts"
}, (opts) => opsStatus.__executeServer(opts));
var opsStatus = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(opsStatus_createServerFn_handler, async () => {
	const instagramToken = Boolean(process.env.INSTAGRAM_ACCESS_TOKEN?.trim());
	return {
		telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim()),
		instagram: false,
		instagramDetail: instagramToken ? "توکن Meta روی سرور هست، ولی انتشار بدون رسانهٔ عمومی و مجوز pages انجام نمی‌شود." : "توکن Meta روی سرور نیست. انتشار اینستاگرام خاموش است؛ فقط کپشن آماده می‌شود.",
		ai: Boolean(process.env.XAI_API_KEY?.trim())
	};
});
var listContent_createServerFn_handler = createServerRpc({
	id: "5226fd5939943983c3fb35a882bcaac2a5cf4e7568fe669342f49121f4eab522",
	name: "listContent",
	filename: "src/lib/ops/api.ts"
}, (opts) => listContent.__executeServer(opts));
var listContent = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(listContent_createServerFn_handler, async ({ context }) => {
	return (await db()).query(`select ${CONTENT_SELECT} from content_items where user_id = $1 order by created_at desc limit 40`, [context.userId]);
});
var draftSchema = object({
	channel: CHANNEL,
	title: string().trim().min(1).max(120),
	body: string().trim().min(1).max(3500)
});
var createDraft_createServerFn_handler = createServerRpc({
	id: "12c4dd9d32033e72d20e975c5f616a31be11d35d222628d62e5aeddb576fa524",
	name: "createDraft",
	filename: "src/lib/ops/api.ts"
}, (opts) => createDraft.__executeServer(opts));
var createDraft = createServerFn({ method: "POST" }).validator((input) => parse(draftSchema, input)).middleware([authMiddleware]).handler(createDraft_createServerFn_handler, async ({ data, context }) => {
	const sql = await db();
	const id = crypto.randomUUID();
	await sql`
      insert into content_items (id, user_id, channel, title, body, status, source)
      values (${id}, ${context.userId}, ${data.channel}, ${data.title}, ${data.body}, 'draft', 'manual')
    `;
	return {
		ok: true,
		id
	};
});
var generateSchema = object({
	channel: CHANNEL,
	brief: string().trim().min(1).max(800)
});
var generateDraft_createServerFn_handler = createServerRpc({
	id: "dcf5bf02fe9ed70882a8a1ecca731a5e9494a7a23567faf5ad5e26fde256a562",
	name: "generateDraft",
	filename: "src/lib/ops/api.ts"
}, (opts) => generateDraft.__executeServer(opts));
var generateDraft = createServerFn({ method: "POST" }).validator((input) => parse(generateSchema, input)).middleware([authMiddleware]).handler(generateDraft_createServerFn_handler, async ({ data, context }) => {
	const sql = await db();
	const voice = (await sql`
      select voice from studio_voice where user_id = ${context.userId}
    `)[0]?.voice?.trim() || "لحن آرام، دقیق، بدون وعدهٔ قیمت";
	const result = await chat(sql, context.userId, "draft", `تو سردبیر فارسی برند هستی. لحن: ${voice}. فقط خودِ متن قابل انتشار را بنویس. هشتگ زیاد نگذار. وعدهٔ سود، ربات و عدد جعلی ننویس.`, `کانال: ${data.channel}\nخواسته: ${data.brief}`);
	if (!result.ok) return result;
	const id = crypto.randomUUID();
	const title = data.brief.slice(0, 80);
	await sql`
      insert into content_items (id, user_id, channel, title, body, status, source)
      values (${id}, ${context.userId}, ${data.channel}, ${title}, ${result.text.slice(0, 3500)}, 'draft', 'ai')
    `;
	return {
		ok: true,
		id
	};
});
var approveContent_createServerFn_handler = createServerRpc({
	id: "b519687a5ea01f21e121e46aeb07bae1273f015ae1a8e58ab3417fa10fd898fa",
	name: "approveContent",
	filename: "src/lib/ops/api.ts"
}, (opts) => approveContent.__executeServer(opts));
var approveContent = createServerFn({ method: "POST" }).validator((input) => parse(object({ id: ID }), input)).middleware([authMiddleware]).handler(approveContent_createServerFn_handler, async ({ data, context }) => {
	if (!(await (await db())`
      update content_items
      set status = 'approved', approved_at = now(), updated_at = now(), error = null
      where id = ${data.id} and user_id = ${context.userId} and status = 'draft'
      returning id
    `)[0]) return {
		ok: false,
		error: "فقط پیش‌نویس را می‌شود تأیید کرد."
	};
	return { ok: true };
});
var retryContent_createServerFn_handler = createServerRpc({
	id: "26120f97165754249f66c09ce1286abe69e3bc52c2b3a8f32878ebe526e3724b",
	name: "retryContent",
	filename: "src/lib/ops/api.ts"
}, (opts) => retryContent.__executeServer(opts));
var retryContent = createServerFn({ method: "POST" }).validator((input) => parse(object({ id: ID }), input)).middleware([authMiddleware]).handler(retryContent_createServerFn_handler, async ({ data, context }) => {
	if (!(await (await db())`
      update content_items
      set status = 'approved', error = null, updated_at = now()
      where id = ${data.id} and user_id = ${context.userId}
        and status = 'failed' and channel = 'telegram' and telegram_message_id is null
      returning id
    `)[0]) return {
		ok: false,
		error: "فقط ارسال ناموفقِ بدون شناسهٔ پیام به تأیید برمی‌گردد."
	};
	return { ok: true };
});
var scheduleContent_createServerFn_handler = createServerRpc({
	id: "6a8c1be83e304e9e0bd9dbdda3b5390479e8eb6953e4b8f780bb6c955464b4ad",
	name: "scheduleContent",
	filename: "src/lib/ops/api.ts"
}, (opts) => scheduleContent.__executeServer(opts));
var scheduleContent = createServerFn({ method: "POST" }).validator((input) => parse(object({
	id: ID,
	at: string().datetime({ offset: true })
}), input)).middleware([authMiddleware]).handler(scheduleContent_createServerFn_handler, async ({ data, context }) => {
	if (!(await (await db())`
      update content_items
      set scheduled_at = ${data.at}::timestamptz, updated_at = now()
      where id = ${data.id} and user_id = ${context.userId} and status in ('draft', 'approved')
      returning id
    `)[0]) return {
		ok: false,
		error: "زمان فقط روی پیش‌نویس یا تأییدشده می‌نشیند."
	};
	return { ok: true };
});
var sendTelegram_createServerFn_handler = createServerRpc({
	id: "7cc2a1aed4d3ca8dc089213650365b453344e7a9a7c785b8e7f53442768ee02b",
	name: "sendTelegram",
	filename: "src/lib/ops/api.ts"
}, (opts) => sendTelegram.__executeServer(opts));
var sendTelegram = createServerFn({ method: "POST" }).validator((input) => parse(object({ id: ID }), input)).middleware([authMiddleware]).handler(sendTelegram_createServerFn_handler, async ({ data, context }) => deliver(await db(), context.userId, data.id));
var dispatchDue_createServerFn_handler = createServerRpc({
	id: "011b246bddbd52eb724625ce41882f0e66ad19bb9dc3a7b5421bce91cbd29e24",
	name: "dispatchDue",
	filename: "src/lib/ops/api.ts"
}, (opts) => dispatchDue.__executeServer(opts));
var dispatchDue = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(dispatchDue_createServerFn_handler, async ({ context }) => {
	const sql = await db();
	const due = await sql`
      select id from content_items
      where user_id = ${context.userId} and channel = 'telegram' and status = 'approved'
        and telegram_message_id is null
        and scheduled_at is not null and scheduled_at <= now()
      order by scheduled_at asc
      limit 5
    `;
	const results = [];
	for (const row of due) {
		const result = await deliver(sql, context.userId, row.id);
		results.push({
			id: row.id,
			...result
		});
	}
	return {
		count: due.length,
		results
	};
});
var releaseStuck_createServerFn_handler = createServerRpc({
	id: "a885126b1e2b6cee7c40952dda7e4eb0e1fbc1eadcba2cf1665f5ae34e393204",
	name: "releaseStuck",
	filename: "src/lib/ops/api.ts"
}, (opts) => releaseStuck.__executeServer(opts));
var releaseStuck = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(releaseStuck_createServerFn_handler, async ({ context }) => {
	return { released: (await (await db())`
      update content_items
      set status = 'failed', updated_at = now(),
          error = 'ارسال ناتمام ماند. اگر پیام در کانال هست، دوباره نفرست.'
      where user_id = ${context.userId} and status = 'sending'
        and updated_at < now() - interval '10 minutes'
      returning id
    `).length };
});
var kpiSnapshot_createServerFn_handler = createServerRpc({
	id: "2c088011fa6e55253ca21f8e90376cd7ba9564981ab366c7ca73079ff951f527",
	name: "kpiSnapshot",
	filename: "src/lib/ops/api.ts"
}, (opts) => kpiSnapshot.__executeServer(opts));
var kpiSnapshot = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(kpiSnapshot_createServerFn_handler, async ({ context }) => {
	const sql = await db();
	const userId = context.userId;
	const content = await sql`
      select
        count(*)::int as created,
        count(*) filter (where status = 'draft')::int as drafts,
        count(*) filter (where approved_at is not null)::int as approved,
        count(*) filter (where status = 'sent')::int as sent,
        count(*) filter (where status = 'failed')::int as failed
      from content_items
      where user_id = ${userId}
    `;
	const leads = await sql`
      select
        count(*)::int as leads,
        count(*) filter (where stage = 'won')::int as won
      from crm_leads
      where user_id = ${userId}
    `;
	const customers = await sql`
      select count(*)::int as n from crm_contacts
      where user_id = ${userId} and kind = 'customer'
    `;
	const ai = await sql`
      select
        count(*)::int as calls,
        case when count(prompt_tokens) = 0 then null
             else coalesce(sum(prompt_tokens), 0)::int + coalesce(sum(completion_tokens), 0)::int
        end as tokens
      from ai_calls
      where user_id = ${userId}
    `;
	const errors = await sql.query(`select error, ${stamp("created_at")} as created_at
       from send_log
       where user_id = $1 and ok = false and error is not null
       order by created_at desc
       limit 8`, [userId]);
	const activity = await sql`
      select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day, count(*)::int as n
      from content_items
      where user_id = ${userId}
      group by 1
      order by 1 desc
      limit 14
    `;
	const row = content[0] ?? {
		created: 0,
		drafts: 0,
		approved: 0,
		sent: 0,
		failed: 0
	};
	const lead = leads[0] ?? {
		leads: 0,
		won: 0
	};
	const usage = ai[0] ?? {
		calls: 0,
		tokens: null
	};
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
		activity
	};
});
var suggestFromResults_createServerFn_handler = createServerRpc({
	id: "b9336b5170314a7177866989dcbe9588d26f68b42345e0ed56c41b84f56b96d3",
	name: "suggestFromResults",
	filename: "src/lib/ops/api.ts"
}, (opts) => suggestFromResults.__executeServer(opts));
var suggestFromResults = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(suggestFromResults_createServerFn_handler, async ({ context }) => {
	const sql = await db();
	const rows = await sql`
      select title, status, error from content_items
      where user_id = ${context.userId} and status in ('sent', 'failed')
      order by updated_at desc
      limit 8
    `;
	if (rows.length === 0) return {
		ok: false,
		error: "هنوز ارسال واقعی نداریم. پیشنهادی از حدس ساخته نشد."
	};
	const voiceRows = await sql`
      select voice from studio_voice where user_id = ${context.userId}
    `;
	const facts = rows.map((row) => `${row.status} | ${row.title}${row.error ? ` | ${row.error}` : ""}`).join("\n");
	const result = await chat(sql, context.userId, "suggest", "با نتیجهٔ واقعی ارسال‌ها یک پیشنهاد کوتاه فارسی بده. آمار نساز.", `لحن: ${voiceRows[0]?.voice || "آرام"}\nنتایج:\n${facts}`);
	if (!result.ok) return result;
	return {
		ok: true,
		text: result.text
	};
});
var voiceSchema = object({ voice: string().trim().max(400) });
var saveVoice_createServerFn_handler = createServerRpc({
	id: "c5d44d943af1642c4f5ec1d8e8669a87d176bb6164ebec2c7086740b095e4a67",
	name: "saveVoice",
	filename: "src/lib/ops/api.ts"
}, (opts) => saveVoice.__executeServer(opts));
var saveVoice = createServerFn({ method: "POST" }).validator((input) => parse(voiceSchema, input)).middleware([authMiddleware]).handler(saveVoice_createServerFn_handler, async ({ data, context }) => {
	await (await db())`
      insert into studio_voice (user_id, voice) values (${context.userId}, ${data.voice})
      on conflict (user_id) do update set voice = excluded.voice
    `;
	return { ok: true };
});
var readVoice_createServerFn_handler = createServerRpc({
	id: "4149eb1f7ea2db7121e3df24ea3b333c90fd173571af55ba629f979acf8c7897",
	name: "readVoice",
	filename: "src/lib/ops/api.ts"
}, (opts) => readVoice.__executeServer(opts));
var readVoice = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(readVoice_createServerFn_handler, async ({ context }) => {
	return { voice: (await (await db())`
      select voice from studio_voice where user_id = ${context.userId}
    `)[0]?.voice ?? "" };
});
var campaignSchema = object({
	title: string().trim().min(1).max(80),
	channel: CHANNEL
});
var addCampaign_createServerFn_handler = createServerRpc({
	id: "dd559b572db1698531c9f630ad78976e1d3097952af98ed6ad2ba206f3d5efe4",
	name: "addCampaign",
	filename: "src/lib/ops/api.ts"
}, (opts) => addCampaign.__executeServer(opts));
var addCampaign = createServerFn({ method: "POST" }).validator((input) => parse(campaignSchema, input)).middleware([authMiddleware]).handler(addCampaign_createServerFn_handler, async ({ data, context }) => {
	const blocked = piiBlock(data.title);
	if (blocked) return {
		ok: false,
		error: blocked
	};
	await (await db())`
      insert into crm_campaigns (id, user_id, title, channel, status)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.title}, ${data.channel}, 'active')
    `;
	return { ok: true };
});
var leadSchema = object({
	label: string().trim().min(1).max(80),
	stage: STAGE,
	source: SOURCE,
	tags: string().trim().max(80).default("")
});
var addLead_createServerFn_handler = createServerRpc({
	id: "02745cb694854130c7a2ab00ab0e2892ca5965173877fd387e1b8177ad4d8285",
	name: "addLead",
	filename: "src/lib/ops/api.ts"
}, (opts) => addLead.__executeServer(opts));
var addLead = createServerFn({ method: "POST" }).validator((input) => parse(leadSchema, input)).middleware([authMiddleware]).handler(addLead_createServerFn_handler, async ({ data, context }) => {
	const blocked = piiBlock(`${data.label} ${data.tags}`);
	if (blocked) return {
		ok: false,
		error: blocked
	};
	const sql = await db();
	try {
		await sql`
        insert into crm_leads (id, user_id, label, stage, source, tags, follow_up)
        values (${crypto.randomUUID()}, ${context.userId}, ${data.label}, ${data.stage}, ${data.source}, ${data.tags}, 'open')
      `;
	} catch (error) {
		if (isDuplicate(error)) return {
			ok: false,
			error: "این سرنخ قبلاً ثبت شده."
		};
		throw error;
	}
	return { ok: true };
});
var setFollowUp_createServerFn_handler = createServerRpc({
	id: "4fd94c4579e1fb48df65b430a0ae8ab14e26b0de3432f9d7b54e0e415c6dd815",
	name: "setFollowUp",
	filename: "src/lib/ops/api.ts"
}, (opts) => setFollowUp.__executeServer(opts));
var setFollowUp = createServerFn({ method: "POST" }).validator((input) => parse(object({
	id: ID,
	followUp: FOLLOW
}), input)).middleware([authMiddleware]).handler(setFollowUp_createServerFn_handler, async ({ data, context }) => {
	if (!(await (await db())`
      update crm_leads set follow_up = ${data.followUp}
      where id = ${data.id} and user_id = ${context.userId}
      returning id
    `)[0]) return {
		ok: false,
		error: "سرنخ پیدا نشد."
	};
	return { ok: true };
});
var contactSchema = object({
	label: string().trim().min(1).max(80),
	kind: KIND,
	source: SOURCE
});
var addContact_createServerFn_handler = createServerRpc({
	id: "cb85a325061fb7ebb7ef9f3abcc8ae80c9eec9015c3e644cd9a0a69afcc9b3df",
	name: "addContact",
	filename: "src/lib/ops/api.ts"
}, (opts) => addContact.__executeServer(opts));
var addContact = createServerFn({ method: "POST" }).validator((input) => parse(contactSchema, input)).middleware([authMiddleware]).handler(addContact_createServerFn_handler, async ({ data, context }) => {
	const blocked = piiBlock(data.label);
	if (blocked) return {
		ok: false,
		error: blocked
	};
	const sql = await db();
	try {
		await sql`
        insert into crm_contacts (id, user_id, label, kind, source)
        values (${crypto.randomUUID()}, ${context.userId}, ${data.label}, ${data.kind}, ${data.source})
      `;
	} catch (error) {
		if (isDuplicate(error)) return {
			ok: false,
			error: "این مخاطب قبلاً ثبت شده."
		};
		throw error;
	}
	return { ok: true };
});
var opportunitySchema = object({
	title: string().trim().min(1).max(80),
	stage: STAGE
});
var addOpportunity_createServerFn_handler = createServerRpc({
	id: "1c9ce534b9fdd88c32427edc13dec44dd978928699d87d799e6c524fda3764a1",
	name: "addOpportunity",
	filename: "src/lib/ops/api.ts"
}, (opts) => addOpportunity.__executeServer(opts));
var addOpportunity = createServerFn({ method: "POST" }).validator((input) => parse(opportunitySchema, input)).middleware([authMiddleware]).handler(addOpportunity_createServerFn_handler, async ({ data, context }) => {
	const blocked = piiBlock(data.title);
	if (blocked) return {
		ok: false,
		error: blocked
	};
	await (await db())`
      insert into crm_opportunities (id, user_id, title, stage)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.title}, ${data.stage})
    `;
	return { ok: true };
});
var taskSchema = object({ title: string().trim().min(1).max(120) });
var addTask_createServerFn_handler = createServerRpc({
	id: "804d60b62bb22c75bea838b3017b06836ba3540e9809ef79036050bbd19ef11c",
	name: "addTask",
	filename: "src/lib/ops/api.ts"
}, (opts) => addTask.__executeServer(opts));
var addTask = createServerFn({ method: "POST" }).validator((input) => parse(taskSchema, input)).middleware([authMiddleware]).handler(addTask_createServerFn_handler, async ({ data, context }) => {
	const blocked = piiBlock(data.title);
	if (blocked) return {
		ok: false,
		error: blocked
	};
	await (await db())`
      insert into crm_tasks (id, user_id, title) values (${crypto.randomUUID()}, ${context.userId}, ${data.title})
    `;
	return { ok: true };
});
var toggleTask_createServerFn_handler = createServerRpc({
	id: "9f09915da49a6efcedeb1a73e837da55a88b4f8b63d005f8ac94113554e2be73",
	name: "toggleTask",
	filename: "src/lib/ops/api.ts"
}, (opts) => toggleTask.__executeServer(opts));
var toggleTask = createServerFn({ method: "POST" }).validator((input) => parse(object({ id: ID }), input)).middleware([authMiddleware]).handler(toggleTask_createServerFn_handler, async ({ data, context }) => {
	await (await db())`
      update crm_tasks set done = not done where id = ${data.id} and user_id = ${context.userId}
    `;
	return { ok: true };
});
var listCrm_createServerFn_handler = createServerRpc({
	id: "6e8993be04421e54ae5f964fa600f970b744a3104fa019c2b44b49870919d8d6",
	name: "listCrm",
	filename: "src/lib/ops/api.ts"
}, (opts) => listCrm.__executeServer(opts));
var listCrm = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(listCrm_createServerFn_handler, async ({ context }) => {
	const sql = await db();
	const userId = context.userId;
	const [campaigns, leads, tasks, interactions, contacts, opportunities] = await Promise.all([
		sql.query("select id, title, channel, status from crm_campaigns where user_id = $1 order by created_at desc limit 20", [userId]),
		sql.query("select id, label, stage, source, follow_up, tags from crm_leads where user_id = $1 order by created_at desc limit 30", [userId]),
		sql.query("select id, title, done from crm_tasks where user_id = $1 order by created_at desc limit 30", [userId]),
		sql.query(`select id, kind, summary, ${stamp("created_at")} as created_at
         from crm_interactions where user_id = $1 order by created_at desc limit 20`, [userId]),
		sql.query("select id, label, kind, source from crm_contacts where user_id = $1 order by created_at desc limit 30", [userId]),
		sql.query("select id, title, stage from crm_opportunities where user_id = $1 order by created_at desc limit 20", [userId])
	]);
	return {
		campaigns,
		leads,
		tasks,
		interactions,
		contacts,
		opportunities
	};
});
//#endregion
export { addCampaign_createServerFn_handler, addContact_createServerFn_handler, addLead_createServerFn_handler, addOpportunity_createServerFn_handler, addTask_createServerFn_handler, approveContent_createServerFn_handler, createDraft_createServerFn_handler, dispatchDue_createServerFn_handler, generateDraft_createServerFn_handler, kpiSnapshot_createServerFn_handler, listContent_createServerFn_handler, listCrm_createServerFn_handler, opsStatus_createServerFn_handler, readVoice_createServerFn_handler, releaseStuck_createServerFn_handler, retryContent_createServerFn_handler, saveVoice_createServerFn_handler, scheduleContent_createServerFn_handler, sendTelegram_createServerFn_handler, setFollowUp_createServerFn_handler, suggestFromResults_createServerFn_handler, toggleTask_createServerFn_handler };
