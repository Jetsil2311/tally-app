"use client";

import { CheckCircle, DownloadSimple, FileCsv, FilePdf, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import { useRef, useState, useTransition } from "react";

import { importCsv } from "@/actions/transfer-files";
import { useI18n } from "@/i18n/client";
import type { Account } from "@/lib/types";

import { ChipGroup } from "./chips";
import { Menu, MenuItem } from "./menu";
import { ProChip, useProGate } from "./plan";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, cn } from "./ui";

// Activity's file button: download what's on screen (CSV or PDF, with the
// current filters) or bring entries in from a bank's CSV.
export function ActivityFiles({ exportQuery, accounts }: { exportQuery: string; accounts: Account[] }) {
  const { t } = useI18n();
  const [importing, setImporting] = useState(false);
  const [session, setSession] = useState(0);
  const writable = accounts.filter((a) => a.isActive && a.myRole !== "viewer");
  // Export is Pro: on the free plan it opens the upgrade sheet
  const gate = useProGate("export");
  const download = (format: "csv" | "pdf") => {
    // A link click: the browser saves the file the route sends back,
    // without leaving the page
    const link = document.createElement("a");
    link.href = `/api/export?format=${format}${exportQuery ? `&${exportQuery}` : ""}`;
    link.download = "";
    link.click();
  };

  return (
    <>
      <Menu
        label={t.files.label}
        panelClassName="w-60"
        trigger={({ open }) => (
          <span
            className={cn(
              "inline-flex size-12 items-center justify-center rounded-full border transition-colors",
              open ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-line-strong",
            )}
          >
            <DownloadSimple size={20} aria-hidden />
          </span>
        )}
      >
        {(close) => (
          <>
            <MenuItem icon={<FileCsv size={18} />} onClick={() => (close(), gate.guard(() => download("csv")))}>
              <span className="flex items-center justify-between gap-2">
                {t.files.csv}
                {gate.locked ? <ProChip /> : null}
              </span>
            </MenuItem>
            <MenuItem icon={<FilePdf size={18} />} onClick={() => (close(), gate.guard(() => download("pdf")))}>
              <span className="flex items-center justify-between gap-2">
                {t.files.pdf}
                {gate.locked ? <ProChip /> : null}
              </span>
            </MenuItem>
            {writable.length ? (
              <div className="mt-1.5 border-t border-line pt-1.5">
                <MenuItem
                  icon={<UploadSimple size={18} />}
                  onClick={() => {
                    close();
                    setSession((n) => n + 1);
                    setImporting(true);
                  }}
                >
                  {t.files.import}
                </MenuItem>
              </div>
            ) : null}
          </>
        )}
      </Menu>
      {gate.sheet}
      <Sheet open={importing} onClose={() => setImporting(false)} title={t.files.import}>
        <ImportForm key={session} accounts={writable} onDone={() => setImporting(false)} />
      </Sheet>
    </>
  );
}

function ImportForm({ accounts, onDone }: { accounts: Account[]; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; failed: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    setFile(picked);
    setResult(null);
  };

  const run = () =>
    startTransition(async () => {
      if (!file) return;
      const csv = await file.text();
      const outcome = await importCsv(accountId, csv);
      if (!outcome.ok) {
        toast(outcome.message, { tone: "error" });
        return;
      }
      setResult(outcome);
      toast(t.files.imported(outcome.created), { tone: "success" });
    });

  return (
    <div className="space-y-6">
      <ChipGroup
        label={t.common.account}
        name="importAccount"
        value={accountId}
        onChange={setAccountId}
        options={accounts.map((account) => ({ value: account.id, label: account.name }))}
      />

      {/* Drop a file or tap to pick one */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          over ? "border-accent bg-accent-soft" : file ? "border-income/50 bg-income-soft" : "border-line-strong hover:border-accent",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <FileCsv size={40} weight="duotone" className={file ? "text-income" : "text-ink-2"} aria-hidden />
        <span className="max-w-full truncate text-[15px] font-semibold">{file ? file.name : t.files.pick}</span>
      </label>

      {result ? (
        <ul className="grid grid-cols-3 gap-2 text-center">
          <li className="rounded-2xl bg-income-soft px-2 py-3 text-income">
            <CheckCircle size={20} weight="fill" className="mx-auto" aria-hidden />
            <span className="tabular mt-1 block text-xl font-semibold">{result.created}</span>
            <span className="text-xs">{t.files.created}</span>
          </li>
          <li className="rounded-2xl bg-surface-2 px-2 py-3 text-ink-2">
            <CheckCircle size={20} className="mx-auto" aria-hidden />
            <span className="tabular mt-1 block text-xl font-semibold">{result.skipped}</span>
            <span className="text-xs">{t.files.duplicates}</span>
          </li>
          <li className={cn("rounded-2xl px-2 py-3", result.failed ? "bg-warn-soft text-warn" : "bg-surface-2 text-ink-3")}>
            <WarningCircle size={20} weight={result.failed ? "fill" : "regular"} className="mx-auto" aria-hidden />
            <span className="tabular mt-1 block text-xl font-semibold">{result.failed}</span>
            <span className="text-xs">{t.files.unreadable}</span>
          </li>
        </ul>
      ) : null}

      {result ? (
        <Button size="lg" className="w-full" onClick={onDone}>
          {t.common.done}
        </Button>
      ) : (
        <Button size="lg" className="w-full" disabled={!file || !accountId || pending} onClick={run}>
          <UploadSimple size={18} /> {pending ? t.files.importing : t.files.import}
        </Button>
      )}
    </div>
  );
}
