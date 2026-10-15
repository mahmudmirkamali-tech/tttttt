import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-6 text-cream">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl">ورود به آتلیه</h1>
        <p className="mt-2 text-sm text-pretty text-mute">
          پیش‌نویس، تأیید و ارسال تلگرام فقط برای حساب خودت ذخیره می‌شود.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
                className="min-h-11 rounded-full border border-line px-4"
              >
                ادامه با {provider.label}
              </button>
            ))
          ) : (
            <p className="text-sm text-mute">ورود غیرفعال است.</p>
          )}
        </div>
      </div>
    </main>
  );
}
