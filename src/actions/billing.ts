"use server";

import { redirect } from "next/navigation";

import { api } from "@/lib/api";
import { env } from "@/lib/env";

import { toActionState } from "./helpers";

// Pro is bought and managed on Stripe's own pages (Checkout and the Billing
// Portal): no card ever touches Tally. These ask the API for the page and
// send the browser there.

export async function startCheckout(): Promise<{ error?: string }> {
  let url: string;
  try {
    ({ url } = await api<{ url: string }>("/billing/checkout", {
      method: "POST",
      body: { successUrl: `${env.appUrl}/pro?checkout=success`, cancelUrl: `${env.appUrl}/pro` },
    }));
  } catch (error) {
    return { error: (await toActionState(error)).message };
  }
  redirect(url);
}

// Embedded Checkout: Stripe's form mounted inside Tally (an iframe Stripe
// renders and processes). After paying, Stripe sends the page to /pro.
export async function createEmbeddedCheckout(): Promise<{ clientSecret?: string; error?: string }> {
  try {
    const { clientSecret } = await api<{ clientSecret: string }>("/billing/checkout", {
      method: "POST",
      body: { embedded: true, returnUrl: `${env.appUrl}/pro?checkout=success` },
    });
    return { clientSecret };
  } catch (error) {
    return { error: (await toActionState(error)).message };
  }
}

export async function openBillingPortal(): Promise<{ error?: string }> {
  let url: string;
  try {
    ({ url } = await api<{ url: string }>("/billing/portal", { method: "POST", body: { returnUrl: `${env.appUrl}/pro` } }));
  } catch (error) {
    return { error: (await toActionState(error)).message };
  }
  redirect(url);
}
