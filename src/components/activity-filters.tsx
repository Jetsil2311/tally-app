"use client";

import { FunnelSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { useI18n } from "@/i18n/client";
import { activityHref, type ActivityQuery } from "@/lib/activity-query";
import { categoryLabel } from "@/lib/insights";
import type { Account, Category, Person } from "@/lib/types";

import { displayName, useViewer } from "./people-ui";
import { Select, cn } from "./ui";

// Search + filters. State lives in the URL, so a filtered view can be
// bookmarked, shared, and survives the back button.
export function ActivityFilters({
  query,
  accounts,
  categories,
  people,
}: {
  query: ActivityQuery;
  accounts: Account[];
  categories: Category[];
  // Everyone on your shared accounts; empty when nothing is shared
  people: Person[];
}) {
  const viewer = useViewer();
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q ?? "");
  const [showFilters, setShowFilters] = useState(
    Boolean(query.type || query.account || query.category || query.filter || query.status || query.by),
  );
  const first = useRef(true);

  const go = (patch: Partial<ActivityQuery>) =>
    startTransition(() => router.replace(activityHref({ ...query, ...patch }), { scroll: false }));

  // Debounced search: waits for a pause in typing
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => go({ q: search.trim() || undefined }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const active = [query.type, query.account, query.category, query.filter, query.status, query.by].filter(Boolean).length;
  const topLevel = categories.filter((c) => !c.parentId);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const scopeLabel = (category: Category, label: string) =>
    category.accountId && accountName.has(category.accountId) ? `${label} · ${accountName.get(category.accountId)}` : label;

  return (
    <div className="space-y-3" aria-busy={pending}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.activity.searchPlaceholder}
            aria-label={t.activity.searchLabel}
            className="h-12 w-full rounded-full border border-line bg-surface pr-4 pl-11 text-base transition-[border-color,box-shadow] placeholder:text-ink-3 focus:border-accent focus:ring-4 focus:ring-accent-soft focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className={cn(
            "inline-flex h-12 items-center gap-2 rounded-full border px-4 text-[15px] font-medium transition-colors",
            showFilters || active ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-line-strong",
          )}
        >
          <FunnelSimple size={18} />
          <span className="hidden sm:inline">{t.activity.filters}</span>
          {active ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-surface text-xs text-ink">{active}</span>
          ) : null}
        </button>
      </div>

      {showFilters ? (
        <div className="rise grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select aria-label={t.common.type} value={query.type ?? ""} onChange={(e) => go({ type: (e.target.value || undefined) as ActivityQuery["type"] })}>
            <option value="">{t.activity.incomeAndExpenses}</option>
            <option value="expense">{t.activity.onlyExpenses}</option>
            <option value="income">{t.activity.onlyIncome}</option>
          </Select>
          <Select aria-label={t.common.account} value={query.account ?? ""} onChange={(e) => go({ account: e.target.value || undefined })}>
            <option value="">{t.activity.allAccounts}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.isActive ? "" : t.common.archivedSuffix}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t.common.category}
            value={query.filter === "uncategorized" ? "__none" : (query.category ?? "")}
            onChange={(e) => {
              const v = e.target.value;
              go(v === "__none" ? { category: undefined, filter: "uncategorized" } : { category: v || undefined, filter: undefined });
            }}
          >
            <option value="">{t.activity.allCategories}</option>
            <option value="__none">{t.activity.withoutCategory}</option>
            {topLevel.map((parent) => (
              <optgroup key={parent.id} label={scopeLabel(parent, categoryLabel(parent.name, t))}>
                <option value={parent.id}>{categoryLabel(parent.name, t)}</option>
                {categories
                  .filter((c) => c.parentId === parent.id)
                  .map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
          <Select
            aria-label={t.approvals.allStatuses}
            value={query.status ?? ""}
            onChange={(e) => go({ status: (e.target.value || undefined) as ActivityQuery["status"] })}
          >
            <option value="">{t.approvals.allStatuses}</option>
            <option value="pending">{t.approvals.onlyPending}</option>
            <option value="rejected">{t.approvals.onlyRejected}</option>
          </Select>
          {people.length > 1 ? (
            <Select aria-label={t.approvals.anyone} value={query.by ?? ""} onChange={(e) => go({ by: e.target.value || undefined })}>
              <option value="">{t.approvals.anyone}</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.id === viewer.id ? t.sharing.you : displayName(person, t.audit.someone)}
                </option>
              ))}
            </Select>
          ) : null}
          <button
            type="button"
            disabled={!active && !query.q}
            onClick={() => {
              setSearch("");
              go({
                type: undefined,
                account: undefined,
                category: undefined,
                filter: undefined,
                status: undefined,
                by: undefined,
                q: undefined,
              });
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
          >
            <X size={16} /> {t.activity.clearAll}
          </button>
        </div>
      ) : null}
    </div>
  );
}
