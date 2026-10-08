"use client";

import { FunnelSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { activityHref, type ActivityQuery } from "@/lib/activity-query";
import type { Account, Category } from "@/lib/types";

import { Select, cn } from "./ui";

// Search + filters. State lives in the URL, so a filtered view can be
// bookmarked, shared, and survives the back button.
export function ActivityFilters({
  query,
  accounts,
  categories,
}: {
  query: ActivityQuery;
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q ?? "");
  const [showFilters, setShowFilters] = useState(Boolean(query.type || query.account || query.category || query.filter));
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

  const active = [query.type, query.account, query.category, query.filter].filter(Boolean).length;
  const topLevel = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-3" aria-busy={pending}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes, merchants…"
            aria-label="Search transactions"
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
          <span className="hidden sm:inline">Filters</span>
          {active ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-surface text-xs text-ink">{active}</span>
          ) : null}
        </button>
      </div>

      {showFilters ? (
        <div className="rise grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select aria-label="Type" value={query.type ?? ""} onChange={(e) => go({ type: (e.target.value || undefined) as ActivityQuery["type"] })}>
            <option value="">Income & expenses</option>
            <option value="expense">Only expenses</option>
            <option value="income">Only income</option>
          </Select>
          <Select aria-label="Account" value={query.account ?? ""} onChange={(e) => go({ account: e.target.value || undefined })}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.isActive ? "" : " (archived)"}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Category"
            value={query.filter === "uncategorized" ? "__none" : (query.category ?? "")}
            onChange={(e) => {
              const v = e.target.value;
              go(v === "__none" ? { category: undefined, filter: "uncategorized" } : { category: v || undefined, filter: undefined });
            }}
          >
            <option value="">All categories</option>
            <option value="__none">Without a category</option>
            {topLevel.map((parent) => (
              <optgroup key={parent.id} label={parent.name}>
                <option value={parent.id}>{parent.name}</option>
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
          <button
            type="button"
            disabled={!active && !query.q}
            onClick={() => {
              setSearch("");
              go({ type: undefined, account: undefined, category: undefined, filter: undefined, q: undefined });
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
          >
            <X size={16} /> Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}
