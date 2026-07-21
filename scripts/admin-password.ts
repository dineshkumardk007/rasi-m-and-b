/**
 * Generate admin login secrets.
 *
 *   pnpm admin:password "your-new-password"   → prints ADMIN_PASSWORD_HASH
 *   pnpm admin:password --secret              → prints a fresh ADMIN_SESSION_SECRET
 *
 * Paste the output into .env.local (local) and Vercel → Settings → Environment
 * Variables (production). Rotating ADMIN_SESSION_SECRET signs every existing
 * admin session out immediately.
 */
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/lib/admin-password";

const arg = process.argv[2];

if (arg === "--secret") {
  console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
  process.exit(0);
}

if (!arg) {
  console.error('Usage: pnpm admin:password "your-new-password"  |  pnpm admin:password --secret');
  process.exit(1);
}

if (arg.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}

console.log(`ADMIN_PASSWORD_HASH=${hashPassword(arg)}`);
