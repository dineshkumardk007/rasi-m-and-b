import { MILESTONES, type Milestone } from "./constants";

/**
 * Baby age maths for the birthday club.
 *
 * Customers store one date (`customers.baby_dob`, "YYYY-MM-DD") and everything
 * else — which milestone to shop, when the birthday lands, what to suggest — is
 * derived from it. Pure functions only, so the storefront, the admin panel and
 * the WhatsApp automation all agree on what "6 months old" means.
 */

/** Oldest age the club covers. Past this the child has outgrown the catalogue. */
export const CLUB_MAX_MONTHS = 36;

/**
 * Parse "YYYY-MM-DD" into local calendar parts.
 *
 * Deliberately NOT `new Date("2025-03-01")` — the bare form is parsed as UTC,
 * so east of Greenwich it reads back as the previous day and every age is off
 * by one at month boundaries.
 */
function parseDob(dob: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
  if (!match) return null;
  const [, ys, ms, ds] = match;
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Reject impossible days (31 Feb): round-trip through Date and compare.
  const probe = new Date(y, m - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) {
    return null;
  }
  return { y, m, d };
}

export function isValidDob(dob: string | null | undefined, now = new Date()): boolean {
  if (!dob) return false;
  const parts = parseDob(dob);
  if (!parts) return false;
  const born = new Date(parts.y, parts.m - 1, parts.d);
  if (born > now) return false; // not born yet
  return ageInMonths(dob, now)! <= 18 * 12; // sanity ceiling, not a club limit
}

/**
 * Whole months lived, by the calendar — a baby born on the 15th turns 1 month
 * old on the 15th of the next month, regardless of how many days that month has.
 * Returns null when the date is unparseable or in the future.
 */
export function ageInMonths(dob: string, now = new Date()): number | null {
  const parts = parseDob(dob);
  if (!parts) return null;
  const born = new Date(parts.y, parts.m - 1, parts.d);
  if (born > now) return null;

  let months = (now.getFullYear() - parts.y) * 12 + (now.getMonth() + 1 - parts.m);
  if (now.getDate() < parts.d) months -= 1; // monthly anniversary not reached
  return Math.max(0, months);
}

/**
 * The milestone a baby of this age should be shopping. Returns null once the
 * child is past the catalogue's range, so callers can hide the club rather than
 * recommend toddler toys to a seven-year-old.
 */
export function milestoneForAge(months: number | null): Milestone | null {
  if (months === null || months < 0) return null;
  if (months < 3) return "newborn";
  if (months < 12) return "infant";
  if (months <= CLUB_MAX_MONTHS) return "toddler";
  return null;
}

export function milestoneForDob(dob: string, now = new Date()): Milestone | null {
  return milestoneForAge(ageInMonths(dob, now));
}

/**
 * The milestone the baby moves into next, and how many months away it is —
 * this is what makes a "coming up: weaning bowls" nudge possible.
 */
export function nextMilestone(
  dob: string,
  now = new Date(),
): { milestone: Milestone; inMonths: number } | null {
  const months = ageInMonths(dob, now);
  if (months === null) return null;
  if (months < 3) return { milestone: "infant", inMonths: 3 - months };
  if (months < 12) return { milestone: "toddler", inMonths: 12 - months };
  return null; // toddler is the last age-based stage
}

/** Human age for greetings: "5 months", "1 year 2 months", "2 years". */
export function formatAge(months: number | null, lang: "en" | "ta" = "en"): string {
  if (months === null) return "";
  const years = Math.floor(months / 12);
  const rem = months % 12;

  if (lang === "ta") {
    if (years === 0) return `${months} மாதம்`;
    return rem === 0 ? `${years} வயது` : `${years} வயது ${rem} மாதம்`;
  }
  const monthWord = (n: number) => `${n} month${n === 1 ? "" : "s"}`;
  const yearWord = (n: number) => `${n} year${n === 1 ? "" : "s"}`;
  if (years === 0) return monthWord(months);
  return rem === 0 ? yearWord(years) : `${yearWord(years)} ${monthWord(rem)}`;
}

/** True during the calendar month the baby was born in — drives the birthday perk. */
export function isBirthdayMonth(dob: string, now = new Date()): boolean {
  const parts = parseDob(dob);
  if (!parts) return false;
  const born = new Date(parts.y, parts.m - 1, parts.d);
  if (born > now) return false;
  return now.getMonth() + 1 === parts.m;
}

/**
 * Days until the next birthday (0 on the day itself). Used to decide whether to
 * show a countdown rather than a generic birthday-month banner.
 */
export function daysToBirthday(dob: string, now = new Date()): number | null {
  const parts = parseDob(dob);
  if (!parts) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), parts.m - 1, parts.d);
  if (next < today) next = new Date(now.getFullYear() + 1, parts.m - 1, parts.d);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

/** Whether a stored DOB should still surface club features. */
export function isInClub(dob: string | null | undefined, now = new Date()): boolean {
  if (!dob || !isValidDob(dob, now)) return false;
  return milestoneForDob(dob, now) !== null;
}

export const MILESTONE_ORDER = MILESTONES;
