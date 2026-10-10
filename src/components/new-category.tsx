"use client";

import { Check, Plus, X } from "@phosphor-icons/react";
import { useRef, useState, useTransition } from "react";

import { createCategoryInline } from "@/actions/categories";
import { useI18n } from "@/i18n/client";
import type { Category } from "@/lib/types";

import { cn } from "./ui";

// A "+ New" chip that turns into a name field, right where categories are
// picked: a missing category never costs the entry being typed. It lives
// inside the entry's <form>, so it's a plain field + button (no nested form)
// and Enter adds the category instead of submitting the entry.
export function NewCategoryChip({
  parentId,
  small,
  onCreated,
}: {
  // Set = adds a subcategory under it
  parentId?: string;
  small?: boolean;
  onCreated: (category: Category) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const label = parentId ? t.quickAdd.newSubcategory : t.quickAdd.newCategory;

  const submit = () => {
    if (!name.trim() || pending) return;
    startTransition(async () => {
      const result = await createCategoryInline(name, parentId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onCreated(result.category);
      setName("");
      setError("");
      setEditing(false);
    });
  };

  const height = small ? "min-h-9 text-sm" : "min-h-11 text-[15px]";

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setEditing(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-4 text-ink-2 transition-colors hover:border-accent hover:text-accent active:scale-[0.97]",
          height,
          small && "px-3",
        )}
      >
        <Plus size={small ? 14 : 16} weight="bold" aria-hidden /> {label}
      </button>
    );
  }

  return (
    <span className="inline-flex shrink-0 flex-col gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-accent bg-surface pr-1 pl-4 focus-within:ring-2 focus-within:ring-accent/30",
          height,
        )}
      >
        <input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setEditing(false);
            }
          }}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          placeholder={t.quickAdd.categoryName}
          maxLength={60}
          autoComplete="off"
          disabled={pending}
          className="w-32 min-w-0 bg-transparent outline-none placeholder:text-ink-3 sm:w-40"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !name.trim()}
          aria-label={t.quickAdd.createCategory}
          className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-ink transition-opacity disabled:opacity-40"
        >
          <Check size={15} weight="bold" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label={t.common.cancel}
          className="flex size-8 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2"
        >
          <X size={15} aria-hidden />
        </button>
      </span>
      {error ? (
        <span role="alert" className="px-2 text-xs text-expense">
          {error}
        </span>
      ) : null}
    </span>
  );
}
