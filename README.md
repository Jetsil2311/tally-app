# Tally: finance dashboard

Web dashboard for the `finance-tracker` API: accounts (cash, debit, credit card), income, expenses, transfers, categories, and monthly and annual reports.

## Setup

1. Start the API (`../finance-tracker`, `npm run dev`, port 3000).
2. `cp .env.example .env.local` and fill it in. `GOOGLE_CLIENT_ID` must be one of the IDs in the API's `GOOGLE_CLIENT_ID`.
3. In Google Cloud Console, add `http://localhost:3001/auth/callback` to the web client's **Authorized redirect URIs**.
4. `npm run dev` and open http://localhost:3001.

## How it fits together

- **Auth**: Google OAuth code flow with PKCE (`src/app/auth/*`). The server swaps the code for an ID token, sends it to `POST /auth/google`, and stores the API's JWT in an httpOnly cookie. The browser never sees the token.
- **Reads**: `src/lib/data.ts` is the only place that calls the API; pages stream behind `<Suspense>` (Cache Components).
- **Writes**: Server Actions in `src/actions/*` call the API, then `refresh()` the page.
- **Transfers and opening balances** are stored in the `Transfers` and `Opening balances` categories and left out of income/expense totals (`src/lib/insights.ts`).
- **Time zone**: month boundaries use the browser's time zone (saved in the `ft_tz` cookie).
- **Currency** is display-only (`ft_currency` cookie); amounts aren't converted.

## Keyboard

`N` / `E` new expense · `I` income · `T` transfer
