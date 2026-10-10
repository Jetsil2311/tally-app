import type { Metadata } from "next";
import { Suspense } from "react";

import { Landing } from "@/components/landing";
import { PreferencesProvider } from "@/components/preferences";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { requestTime } from "@/lib/session";

// The public landing page. Signed-out visitors see it at "/" (the proxy
// rewrites to here); it's also reachable directly at /landing.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { absolute: t.landing.metaTitle },
    description: t.landing.metaDescription,
    openGraph: { title: t.landing.metaTitle, description: t.landing.metaDescription, type: "website" },
  };
}

export default function LandingPage() {
  return (
    // The copy depends on the visitor's language cookie, so it streams in
    <Suspense fallback={<div className="min-h-dvh bg-bg" aria-busy />}>
      <LandingContent />
    </Suspense>
  );
}

// Example amounts read naturally in the visitor's region's currency
function currencyFor(locale: string) {
  const region = locale.split("-")[1];
  if (region === "MX") return "MXN";
  if (region === "ES") return "EUR";
  return "USD";
}

async function LandingContent() {
  const { locale } = await getI18n();
  const year = (await requestTime()).getFullYear();
  const currency = currencyFor(locale);
  return (
    <I18nProvider locale={locale}>
      <PreferencesProvider currency={currency} timeZone="UTC">
        <Landing currency={currency} year={year} />
      </PreferencesProvider>
    </I18nProvider>
  );
}
