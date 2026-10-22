import { CreditCard, Wallet } from "@phosphor-icons/react/dist/ssr";

import type { Dictionary } from "@/i18n/dictionaries";

import { RememberTotal } from "./last-total";
import { Money } from "./preferences";

// Home's hero: the one number that matters most (everything you have, net
// of what's owed on cards), on a deep brand-purple surface with light drifting
// across it. Where the money is sits under it as two frosted chips.
export function NetCard({
  net,
  approximate,
  available,
  availableApproximate,
  owed,
  owedApproximate,
  accountCount,
  t,
}: {
  net: number;
  approximate: boolean;
  available: number;
  availableApproximate: boolean;
  owed: number;
  owedApproximate: boolean;
  accountCount: number;
  t: Dictionary;
}) {
  return (
    <section
      className="hero-money grain rise relative isolate overflow-hidden rounded-3xl p-6 text-white sm:p-7 lg:col-span-7"
      style={{ "--i": 1 } as React.CSSProperties}
      aria-labelledby="net-title"
    >
      <span aria-hidden className="hero-light" />
      <RememberTotal cents={net} />
      {/* Concentric rings, like the guilloche on a banknote, very faint */}
      <svg aria-hidden className="pointer-events-none absolute -right-28 -bottom-40 size-[26rem] text-white/[0.07]" viewBox="0 0 200 200" fill="none">
        {[96, 80, 64, 48, 32].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} stroke="currentColor" strokeWidth="1" />
        ))}
      </svg>
      <div className="relative flex h-full flex-col">
        <h2 id="net-title" className="font-sans text-sm font-medium tracking-normal text-white/75" title={t.home.netAcross(accountCount)}>
          {t.home.total}
          <span className="sr-only">: {t.home.netAcross(accountCount)}</span>
        </h2>
        <Money
          cents={net}
          approximate={approximate}
          className="num-in font-display mt-3 block truncate text-[clamp(2.4rem,12vw,3.25rem)] leading-none font-semibold tracking-[-0.045em] [text-shadow:0_2px_24px_rgb(0_0_40/0.25)] sm:text-[64px]"
        />
        {/* Where it is: cash/debit and what's owed on cards, as icon + amount */}
        <dl className="mt-8 flex flex-wrap gap-2 lg:mt-auto lg:pt-10">
          <div className="chip-glass flex min-w-0 items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5" title={t.home.cashAndDebit}>
            <dt className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/18">
              <Wallet size={17} weight="fill" aria-hidden />
              <span className="sr-only">{t.home.cashAndDebit}</span>
            </dt>
            <dd>
              <Money cents={available} approximate={availableApproximate} className="block truncate font-medium" />
            </dd>
          </div>
          {owed !== 0 ? (
            <div className="chip-glass flex min-w-0 items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5" title={t.home.creditOwed}>
              <dt className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/18">
                <CreditCard size={17} weight="fill" aria-hidden />
                <span className="sr-only">{t.home.creditOwed}</span>
              </dt>
              <dd>
                <Money cents={-Math.abs(owed)} sign approximate={owedApproximate} className="block truncate font-medium" />
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
}
