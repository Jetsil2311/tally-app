// Tally never shows emoji (icons only). Text that comes from elsewhere (the
// AI's answers and insights) goes through this before it's displayed.
const EMOJI = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D|\p{Emoji_Modifier}|(?:\p{Extended_Pictographic}|\p{Regional_Indicator}))*/gu;

export function stripEmoji(text: string) {
  return text
    .replace(EMOJI, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:!?)])/g, "$1")
    .replace(/^[ \t]+/gm, "");
}
