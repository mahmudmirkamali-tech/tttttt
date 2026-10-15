# آتلیه — بستهٔ ادامهٔ توسعه

استودیوی فارسی ساخت مجموعهٔ دیجیتال (NFT): هویت برند، چیدن اثر از لایه‌ها، متن جذب، بستهٔ نشر، و چرخهٔ پیش‌نویس/تأیید/ارسال تلگرام به‌ازای هر کاربر.

## اجرا

```bash
npm install
npm run dev
```

سرور روی پورت `8080` بالا می‌آید (`npm run dev`). برای بررسی نوع: `npm run typecheck`. برای ساخت تولید: `npm run build`.

`node_modules` داخل این زیپ نیست. بعد از `npm install` دوباره ساخته می‌شود.

## نقشه

| مسیر | کار |
|---|---|
| `src/routes/index.tsx` | صفحهٔ اصلی؛ فقط `<Studio />` |
| `src/components/atelier/studio.tsx` | پوسته و پنج نما: میز، ساخت، جذب، نشر، دستیار |
| `src/components/atelier/ops.tsx` | چرخهٔ انتشار، KPI و CRM (نیاز به ورود) |
| `src/components/atelier/ui.tsx` | کارت، فیلد، دکمهٔ کپی |
| `src/components/atelier/motif.tsx` | نقش هندسی هر اثر |
| `src/lib/atelier/model.ts` | مدل مجموعه، متن‌ها، محاسبه |
| `src/lib/atelier/store.ts` | وضعیت محلی (zustand + localStorage) |
| `src/lib/ops/api.ts` | توابع سرور: پیش‌نویس، AI، تلگرام، CRM |
| `src/lib/ops/publish.ts` | قواعد ارسال تلگرام (بدون راز) |
| `src/styles.css` | توکن‌های رنگ و فونت وزیرمتن / لاله‌زار |
| `migrations/` | اسکیمای احراز هویت و جداول ops |

راست‌به‌چپ است: `lang="fa"` و `dir="rtl"` در `src/routes/__root.tsx`.

## حساب و داده

ورود روشن است (گوگل و ایکس). داده‌های نشر و CRM با `user_id` جدا می‌شوند. مجموعه و متن‌های میز روی دستگاه خود کاربر می‌مانند و به سرور نمی‌روند.

ارسال تلگرام فقط اگر `TELEGRAM_BOT_TOKEN` و `TELEGRAM_CHAT_ID` روی سرور باشند انجام می‌شود. تولید متن با `XAI_API_KEY` و مدل `grok-4.5` است؛ اگر کلید نباشد متن جعلی ساخته نمی‌شود.

## دست نزن

- `src/lib/auth/` را بازنویسی نکن.
- `src/routes/auth/popup.tsx` نساز.
- فایل `.env` نساز.
- `public/__grok/` و `server/middleware/grok-pwa.ts` را پاک نکن.
- `startup.sh` را حذف نکن؛ با `npm run dev` سرور را بالا می‌آورد.

## محصول الان چه می‌کند

مینت روی بلاکچین و پست خودکار اینستاگرام ندارد. متن آماده می‌دهد. ارسال واقعی فقط تلگرامِ تأییدشده، از سرور، و فقط برای صاحب همان حساب است.
