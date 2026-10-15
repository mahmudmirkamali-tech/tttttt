import { n as createMiddleware } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/publish-Be_cCY0W.js
/**
* Auth middleware for server functions — the standard way to get the caller's
* verified user id. When deployed the session cookie is same-origin and rides
* along automatically. In the live preview the client also forwards the bearer
* token (partitioned cookies) via the `.client` hook below — call sites do not
* thread it themselves.
*
*   import { createServerFn } from "@tanstack/react-start";
*   import { getSql } from "@/lib/db";
*   import { authMiddleware } from "@/lib/auth/middleware";
*
*   export const listTodos = createServerFn({ method: "GET" })
*     .middleware([authMiddleware])
*     .handler(async ({ context }) => {
*       const sql = await getSql();
*       return sql`select * from todos where user_id = ${context.userId}`;
*     });
*
* Signed out with auth on (live preview included) -> throws `UnauthorizedError`
* (see `verify.server.ts`). With auth disabled (`VITE_AUTH_ENABLED=false`, the
* shipped default) it resolves the shared dev user — but throws instead when a
* `DATABASE_URL` is also set, so an app without sign-in must not use this at
* all. On the auth-on path, use it on every server function that touches
* per-user data and scope every query by `context.userId`.
*/
var authMiddleware = createMiddleware({ type: "function" }).client(async ({ next }) => {
	const { getBearerToken } = await import("./client-IWHfIGH2.mjs").then((n) => n.n);
	return next({ sendContext: { bearerToken: getBearerToken() ?? void 0 } });
}).server(async ({ next, context }) => {
	const { assertSameSiteRequest } = await import("./isolation.server-CGNg1r0B.mjs");
	const { requireUserId } = await import("./verify.server-C3wCduhX.mjs");
	assertSameSiteRequest();
	return next({ context: { userId: await requireUserId(context.bearerToken) } });
});
function claimAllowed(status, channel, messageId) {
	return channel === "telegram" && status === "approved" && !messageId;
}
function interpretTelegram(httpStatus, payload) {
	if (httpStatus < 200 || httpStatus >= 300 || !payload.ok || payload.result?.message_id == null) return {
		ok: false,
		error: (payload.description || `Telegram HTTP ${httpStatus}`).slice(0, 300)
	};
	return {
		ok: true,
		messageId: String(payload.result.message_id)
	};
}
function scrubSecret(message, token) {
	return (token ? message.split(token).join("••••") : message).slice(0, 300);
}
var INSTAGRAM_REQUIREMENTS = [
	"حساب حرفه‌ای اینستاگرام، وصل به یک پیج فیسبوک",
	"اپ Meta با بازبینی و مجوزهای instagram_content_publish و pages_show_list",
	"برای آمار: instagram_manage_insights. بدون این مجوز عددی نشان داده نمی‌شود",
	"انتشار فید به آدرس عمومی تصویر نیاز دارد؛ کپشن خالی از API رسمی رد می‌شود",
	"توکن بلندمدت فقط در متغیر سرور. مرورگر داخل ایران اغلب به graph.facebook.com نمی‌رسد"
];
//#endregion
export { scrubSecret as a, interpretTelegram as i, authMiddleware as n, claimAllowed as r, INSTAGRAM_REQUIREMENTS as t };
