import Link from "next/link";

import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-ink-2">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="mt-2 text-ink-2">The link may be old, or the address has a typo.</p>
      <Link href="/" className={`${buttonClass("primary")} mt-6`}>
        Back to home
      </Link>
    </main>
  );
}
