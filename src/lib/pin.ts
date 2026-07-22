/**
 * PIN code parsing, matching, and serviceability verification.
 * Supports exact 6-digit PINs, ranges (e.g. "628001-628020"), and wildcard prefixes (e.g. "628*").
 */

/**
 * Checks if a 6-digit PIN matches a specific pattern (exact, range, or wildcard).
 */
export function isPinMatch(pin: string, pattern: string): boolean {
  const cleanPin = pin.trim().replace(/\D/g, "");
  if (cleanPin.length !== 6) return false;

  const cleanPattern = pattern.trim();
  if (!cleanPattern) return false;

  // Wildcard pattern: e.g. "628*" or "628" or "62*"
  if (cleanPattern.endsWith("*")) {
    const prefix = cleanPattern.slice(0, -1).replace(/\D/g, "");
    return cleanPin.startsWith(prefix);
  }

  // Range pattern: e.g. "628001-628020" or "628001 - 628020"
  if (cleanPattern.includes("-")) {
    const parts = cleanPattern.split("-").map((p) => p.trim().replace(/\D/g, ""));
    const p0 = parts[0] ?? "";
    const p1 = parts[1] ?? "";
    if (parts.length === 2 && p0.length === 6 && p1.length === 6) {
      const min = parseInt(p0, 10);
      const max = parseInt(p1, 10);
      const val = parseInt(cleanPin, 10);
      const start = Math.min(min, max);
      const end = Math.max(min, max);
      return val >= start && val <= end;
    }
  }

  // Exact number string, allow exact 6-digit match or prefix if shorthand
  const numericPattern = cleanPattern.replace(/\D/g, "");
  if (cleanPattern.length < 6 && /^\d+$/.test(cleanPattern)) {
    // Shorthand prefix e.g. "628" without asterisk
    return cleanPin.startsWith(numericPattern);
  }

  return cleanPin === numericPattern;
}

export interface PinCheckResult {
  serviceable: boolean;
  matchedPattern?: string;
  isExcluded?: boolean;
}

/**
 * Evaluates whether a given 6-digit PIN is serviceable based on serviceable patterns
 * and optional unserviceable/excluded patterns.
 */
export function isPinServiceable(
  pin: string,
  serviceablePins: string[] = [],
  unserviceablePins: string[] = [],
): PinCheckResult {
  const cleanPin = pin.trim().replace(/\D/g, "");
  if (cleanPin.length !== 6) {
    return { serviceable: false };
  }

  // 1. Check if explicitly blacklisted / unserviceable
  for (const pattern of unserviceablePins) {
    if (isPinMatch(cleanPin, pattern)) {
      return { serviceable: false, isExcluded: true, matchedPattern: pattern };
    }
  }

  // 2. Check if matched in serviceable patterns
  for (const pattern of serviceablePins) {
    if (isPinMatch(cleanPin, pattern)) {
      return { serviceable: true, matchedPattern: pattern };
    }
  }

  return { serviceable: false };
}

/**
 * Cleans and parses a string of comma or newline separated PIN entries into clean pattern strings.
 */
export function parsePinInput(input: string): string[] {
  const rawList = input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const validPatterns: string[] = [];
  const seen = new Set<string>();

  for (const raw of rawList) {
    let cleaned = raw;
    // Standardize range dash
    cleaned = cleaned.replace(/–|—/g, "-");

    // Match exact 6-digit, wildcard prefix (e.g. 628*), prefix number (e.g. 628), or range (e.g. 628001-628020)
    const isValid =
      /^\d{6}$/.test(cleaned) ||
      /^\d{1,5}\*?$/.test(cleaned) ||
      /^\d{6}\s*-\s*\d{6}$/.test(cleaned);

    if (isValid && !seen.has(cleaned)) {
      seen.add(cleaned);
      validPatterns.push(cleaned);
    }
  }

  return validPatterns;
}

/**
 * Formats a list of PIN patterns into a human-readable display string.
 */
export function formatPinSummary(patterns: string[]): string {
  if (!patterns || patterns.length === 0) return "None configured";

  return patterns
    .map((p) => {
      const trimmed = p.trim().replace(/–|—/g, "-");
      if (trimmed.endsWith("*")) {
        return `Prefix ${trimmed}`;
      }
      if (trimmed.includes("-")) {
        return `Range ${trimmed}`;
      }
      return trimmed;
    })
    .join(", ");
}
