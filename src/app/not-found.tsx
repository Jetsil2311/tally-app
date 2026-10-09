import Link from "next/link";
import { Suspense } from "react";

import { buttonClass } from "@/components/ui";
import { getI18n } from "@/i18n/server";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-ink-2">404</p>
      {/* The words depend on the language cookie, so they stream in */}
      <Suspense>
        <Message />
      </Suspense>
    </main>
  );
}

async function Message() {
  const { t } = await getI18n();
  return (
    <>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.errors.notFoundTitle}</h1>
      <p className="mt-2 text-ink-2">{t.errors.notFoundBody}</p>
      <Link href="/" className={`${buttonClass("primary")} mt-6`}>
        {t.errors.backHome}
      </Link>
    </>
  );
}
