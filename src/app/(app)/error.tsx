"use client";

import { CloudSlash } from "@phosphor-icons/react";
import { useEffect } from "react";

import { Button, Card } from "@/components/ui";

// Shown when a page can't load, most often because the finance API is down
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-warn-soft text-warn">
        <CloudSlash size={26} />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">We couldn&apos;t load your numbers</h1>
      <p className="mt-2 text-ink-2">
        The finance service didn&apos;t answer. Check that it&apos;s running, then try again. Nothing you saved is lost.
      </p>
      <Button className="mt-6" onClick={() => retry()}>
        Try again
      </Button>
    </Card>
  );
}
