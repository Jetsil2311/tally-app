"use client";

import { CloudSlash } from "@phosphor-icons/react";
import { useEffect } from "react";

import { Button, Card } from "@/components/ui";
import { useI18n } from "@/i18n/client";

// Shown when a page can't load, most often because the finance API is down
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-warn-soft text-warn">
        <CloudSlash size={26} />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{t.errors.loadTitle}</h1>
      <p className="mt-2 text-ink-2">{t.errors.loadBody}</p>
      <Button className="mt-6" onClick={() => retry()}>
        {t.errors.retry}
      </Button>
    </Card>
  );
}
