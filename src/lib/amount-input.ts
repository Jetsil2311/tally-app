import type { ChangeEvent } from "react";

// Money fields format themselves while you type: "1234567.5" shows as
// "1,234,567.5". Commas are inserted every 3 digits from the right (only
// from 4 digits on), the decimal point is a dot, at most 2 decimals.
//
// Nobody needs to type a thousands comma, so pressing "," types the decimal
// point (people who write "12,50" get 12.50, not 1,250). A pasted "12,50"
// is read the same way; a pasted "1,234.50" keeps its meaning.
//
// The server reads both forms (lib parseAmount strips the commas), and
// `raw` (no commas) is what the app's own previews and checks use.

const MAX_DECIMALS = 2;

// "1234567.5" -> "1,234,567.5"; keeps a trailing "." while typing
export function formatAmountText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const { formatted } = normalize(String(value));
  return formatted;
}

// "1,234,567.5" -> "1234567.5"
export function unformatAmount(value: string): string {
  return normalize(value).raw;
}

function normalize(input: string, pasted = false): { raw: string; formatted: string } {
  let text = input.replace(/[^\d.,]/g, "");
  // Pasted without a dot: one comma with 1-2 digits after it is a decimal
  // comma ("12,50"). Only for pasted text: while editing, "1,23" is just
  // "1,234" with a digit deleted.
  if (pasted && !text.includes(".") && /^\d+,\d{1,2}$/.test(text)) {
    text = text.replace(",", ".");
  }
  text = text.replace(/,/g, "");
  const dot = text.indexOf(".");
  let whole = dot === -1 ? text : text.slice(0, dot);
  const fraction = dot === -1 ? null : text.slice(dot + 1).replace(/\./g, "").slice(0, MAX_DECIMALS);
  // No leading zeros ("007" -> "7"), but "0.5" keeps its zero
  whole = whole.replace(/^0+(?=\d)/, "");
  if (whole === "" && fraction !== null) whole = "0";
  const grouped = whole.length >= 4 ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : whole;
  return {
    raw: fraction === null ? whole : `${whole}.${fraction}`,
    formatted: fraction === null ? grouped : `${grouped}.${fraction}`,
  };
}

// For an input's onChange: reformats it in place, keeps the cursor next to
// the same digit, and returns the plain number text.
export function formatMoneyInput(event: ChangeEvent<HTMLInputElement>): { raw: string; formatted: string } {
  const input = event.target;
  let value = input.value;
  let caret = input.selectionStart ?? value.length;
  const native = event.nativeEvent as InputEvent;
  const pasted = native.inputType === "insertFromPaste" || native.inputType === "insertFromDrop";

  // The comma key types the decimal point; a second one is ignored
  if (native.data === "," && value[caret - 1] === ",") {
    const before = value.slice(0, caret - 1);
    const after = value.slice(caret);
    if ((before + after).includes(".")) {
      value = before + after;
      caret -= 1;
    } else {
      value = `${before}.${after}`;
    }
  }

  // Where the cursor is, counted in digits and dots (commas move around)
  const significant = value.slice(0, caret).replace(/[^\d.]/g, "").length;
  const { raw, formatted } = normalize(value, pasted);

  // At the end stays at the end (typing, pasting); otherwise after the
  // same number of digits as before
  let position = caret >= value.length ? formatted.length : 0;
  let seen = 0;
  while (position < formatted.length && seen < significant) {
    if (/[\d.]/.test(formatted[position]!)) seen += 1;
    position += 1;
  }
  input.value = formatted;
  try {
    input.setSelectionRange(position, position);
  } catch {}
  return { raw, formatted };
}
