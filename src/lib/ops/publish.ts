export function claimAllowed(status: string, channel: string, messageId: string | null) {
  return channel === "telegram" && status === "approved" && !messageId;
}

export function interpretTelegram(
  httpStatus: number,
  payload: { ok?: boolean; description?: string; result?: { message_id?: number } },
): { ok: true; messageId: string } | { ok: false; error: string } {
  if (httpStatus < 200 || httpStatus >= 300 || !payload.ok || payload.result?.message_id == null) {
    return { ok: false, error: (payload.description || `Telegram HTTP ${httpStatus}`).slice(0, 300) };
  }
  return { ok: true, messageId: String(payload.result.message_id) };
}

export function scrubSecret(message: string, token: string) {
  const clean = token ? message.split(token).join("••••") : message;
  return clean.slice(0, 300);
}

export const INSTAGRAM_REQUIREMENTS = [
  "حساب حرفه‌ای اینستاگرام، وصل به یک پیج فیسبوک",
  "اپ Meta با بازبینی و مجوزهای instagram_content_publish و pages_show_list",
  "برای آمار: instagram_manage_insights. بدون این مجوز عددی نشان داده نمی‌شود",
  "انتشار فید به آدرس عمومی تصویر نیاز دارد؛ کپشن خالی از API رسمی رد می‌شود",
  "توکن بلندمدت فقط در متغیر سرور. مرورگر داخل ایران اغلب به graph.facebook.com نمی‌رسد",
] as const;
