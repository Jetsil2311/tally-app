"use client";

import { ArrowsLeftRight, CaretRight, PencilSimple, Plus, Sparkle, Tag, Trash } from "@phosphor-icons/react";
import { useActionState, useState, useTransition } from "react";

import { createStarterCategories, deleteCategory, saveCategory } from "@/actions/categories";
import { useI18n } from "@/i18n/client";
import { categoryLabel, isSystemCategory, isTransferCategory } from "@/lib/insights";
import type { ActionState, Category } from "@/lib/types";

import { Money } from "./preferences";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, Card, cn, EmptyState, Field, IconButton, Input, Select } from "./ui";
import { submitWith } from "./use-form-action";

type Editing = { category?: Category; parentId?: string; session: number };

export function CategoriesManager({
  categories,
  spent,
}: {
  categories: Category[];
  spent: Record<string, number>; // category id -> cents spent this month
}) {
  const toast = useToast();
  const { t } = useI18n();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [open, setOpen] = useState(false);
  const [seeding, startSeeding] = useTransition();
  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  const edit = (value: Omit<Editing, "session">) => {
    setEditing({ ...value, session: Date.now() });
    setOpen(true);
  };

  const seed = () =>
    startSeeding(async () => {
      const result = await createStarterCategories();
      toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
    });

  return (
    <>
      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="rise text-[28px] font-semibold tracking-tight sm:text-[32px]">{t.nav.categories}</h1>
          <p className="mt-1 max-w-[56ch] text-ink-2">{t.categories.intro}</p>
        </div>
        <div className="flex gap-2">
          {topLevel.length > 0 ? (
            <Button variant="secondary" onClick={seed} disabled={seeding}>
              <Sparkle size={18} /> {seeding ? t.categories.adding : t.categories.addStarter}
            </Button>
          ) : null}
          <Button onClick={() => edit({})}>
            <Plus size={18} weight="bold" /> {t.categories.newCategory}
          </Button>
        </div>
      </div>

      {topLevel.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tag size={24} />}
            title={t.categories.emptyTitle}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={seed} disabled={seeding}>
                  <Sparkle size={18} /> {seeding ? t.categories.adding : t.categories.useStarter}
                </Button>
                <Button variant="secondary" onClick={() => edit({})}>
                  {t.categories.startFromScratch}
                </Button>
              </div>
            }
          >
            {t.categories.emptyBody}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {topLevel.map((parent, i) => {
            const kids = childrenOf(parent.id);
            const transfer = isSystemCategory(parent.name);
            const isMove = isTransferCategory(parent.name);
            const total = (spent[parent.id] ?? 0) + kids.reduce((sum, k) => sum + (spent[k.id] ?? 0), 0);
            return (
              <Card key={parent.id} className="rise p-2" style={{ "--i": Math.min(i, 10) } as React.CSSProperties}>
                <div className="flex items-center gap-3 py-1 pr-1 pl-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      transfer ? "bg-accent-soft text-accent" : "bg-surface-3 text-ink-2",
                    )}
                  >
                    {isMove ? <ArrowsLeftRight size={18} /> : <Tag size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{categoryLabel(parent.name, t)}</p>
                    <p className="text-sm text-ink-2">
                      {transfer
                        ? isMove
                          ? t.categories.transferNote
                          : t.categories.openingNote
                        : total
                          ? t.categories.spentThisMonth(<Money cents={total} />)
                          : t.categories.nothingSpent}
                    </p>
                  </div>
                  <IconButton label={t.categories.addSubcategory(parent.name)} onClick={() => edit({ parentId: parent.id })}>
                    <Plus size={18} />
                  </IconButton>
                  <IconButton label={t.categories.edit(parent.name)} onClick={() => edit({ category: parent })}>
                    <PencilSimple size={18} />
                  </IconButton>
                </div>
                {kids.length ? (
                  <ul className="mt-1 ml-8 border-l border-line pl-2">
                    {kids.map((kid) => (
                      <li key={kid.id}>
                        <button
                          type="button"
                          onClick={() => edit({ category: kid })}
                          className="flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 text-left text-[15px] transition-colors hover:bg-surface-2"
                        >
                          <span className="flex-1 truncate">{kid.name}</span>
                          {spent[kid.id] ? <Money cents={spent[kid.id]} className="text-sm text-ink-2" /> : null}
                          <CaretRight size={14} className="text-ink-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={editing?.category ? t.categories.editCategory : editing?.parentId ? t.categories.newSubcategory : t.categories.newCategory}
      >
        {editing ? (
          <CategoryForm
            key={editing.session}
            category={editing.category}
            parentId={editing.parentId}
            parents={topLevel}
            hasChildren={editing.category ? childrenOf(editing.category.id).length > 0 : false}
            onDone={() => setOpen(false)}
          />
        ) : null}
      </Sheet>
    </>
  );
}

function CategoryForm({
  category,
  parentId,
  parents,
  hasChildren,
  onDone,
}: {
  category?: Category;
  parentId?: string;
  parents: Category[];
  hasChildren: boolean;
  onDone: () => void;
}) {
  const toast = useToast();
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveCategory(prev, formData);
    if (result.ok) {
      toast(result.message ?? t.common.saved);
      onDone();
    }
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};
  const currentParent = category ? (category.parentId ?? "") : (parentId ?? "");

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-6" noValidate>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <Field label={t.common.name} htmlFor="category-name" error={errors.name}>
        <Input
          id="category-name"
          name="name"
          defaultValue={category?.name}
          placeholder={t.categories.namePlaceholder}
          autoFocus
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
        />
      </Field>
      {!hasChildren ? (
        <Field label={t.categories.inside} htmlFor="category-parent" hint={t.categories.insideHint}>
          <Select id="category-parent" name="parentId" defaultValue={currentParent}>
            <option value="">{t.categories.topLevel}</option>
            {parents
              .filter((p) => p.id !== category?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {categoryLabel(p.name, t)}
                </option>
              ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="parentId" value="" />
      )}

      {state.message && !state.ok && !Object.keys(errors).length ? (
        <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
          {state.message}
        </p>
      ) : null}

      {confirming ? (
        <p className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
          {t.categories.deleteWarning(hasChildren)}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {category ? (
          <Button
            type="button"
            size="lg"
            variant={confirming ? "danger" : "ghost"}
            disabled={deleting}
            className={cn("sm:flex-1", !confirming && "text-expense")}
            onClick={() => {
              if (!confirming) return setConfirming(true);
              startDelete(async () => {
                const result = await deleteCategory(category.id);
                toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
                if (result.ok) onDone();
              });
            }}
          >
            <Trash size={18} /> {confirming ? t.categories.deleteForGood : t.common.delete}
          </Button>
        ) : null}
        <Button type="submit" size="lg" disabled={pending} className="sm:flex-1">
          {pending ? t.common.saving : category ? t.common.saveChanges : t.common.create}
        </Button>
      </div>
    </form>
  );
}
