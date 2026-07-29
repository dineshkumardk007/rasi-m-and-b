/**
 * Convert any image — or a whole folder of them — to an exact box size.
 *
 *   pnpm fit:image "C:/photos/shot.jpg"
 *   pnpm fit:image "C:/photos"                        # every image in the folder
 *   pnpm fit:image "C:/photos" --strategy mirror
 *   pnpm fit:image "C:/photos" --size 1200x400 --format jpeg
 *   pnpm fit:image "C:/photos" --compare              # one file, every strategy
 *
 * Defaults to 600x360 (5:3) WebP using the `blur` strategy, which fits the whole
 * image in and fills the leftover space with a blurred copy of itself — nothing
 * cropped, nothing stretched. See src/lib/fit-box.ts for the other strategies
 * and when each one wins.
 *
 * Originals are never modified; results go to a sibling `fitted/` folder unless
 * --out says otherwise.
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { DEFAULT_BOX, fitToBox, type FitFormat, type FitStrategy } from "../src/lib/fit-box";

const STRATEGIES: FitStrategy[] = ["blur", "mirror", "color", "attention", "cover"];
const FORMATS: FitFormat[] = ["webp", "jpeg", "png"];
const READABLE = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tif", ".tiff"]);

function flag(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
}

const input = process.argv[2];
const compare = process.argv.includes("--compare");

if (!input || input.startsWith("--")) {
  console.error(
    'Usage: pnpm fit:image "C:/path/to/image-or-folder" [--size 600x360] ' +
      "[--strategy blur|mirror|color|attention|cover] [--format webp|jpeg|png] " +
      "[--inset 1] [--background '#FFFFFF'] [--out DIR] [--compare]",
  );
  process.exit(1);
}

const source = resolve(input);
const stats = statSync(source, { throwIfNoEntry: false });
if (!stats) {
  console.error(`❌ Not found: ${source}`);
  process.exit(1);
}

const sizeArg = flag("size");
let width: number = DEFAULT_BOX.width;
let height: number = DEFAULT_BOX.height;
if (sizeArg) {
  const match = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(sizeArg);
  if (!match) {
    console.error(`❌ --size must look like 600x360, got "${sizeArg}"`);
    process.exit(1);
  }
  width = Number(match[1]);
  height = Number(match[2]);
}

const strategyArg = (flag("strategy") ?? "blur") as FitStrategy;
if (!STRATEGIES.includes(strategyArg)) {
  console.error(`❌ --strategy must be one of: ${STRATEGIES.join(", ")}`);
  process.exit(1);
}

const formatArg = (flag("format") ?? "webp") as FitFormat;
if (!FORMATS.includes(formatArg)) {
  console.error(`❌ --format must be one of: ${FORMATS.join(", ")}`);
  process.exit(1);
}

const insetArg = flag("inset") ? Number(flag("inset")) : 1;
const backgroundArg = flag("background") ?? "#FFFFFF";

const files = stats.isDirectory()
  ? readdirSync(source)
      .filter((f) => READABLE.has(extname(f).toLowerCase()))
      .map((f) => join(source, f))
  : [source];

if (files.length === 0) {
  console.error(`❌ No images found in ${source}`);
  process.exit(1);
}

const outDir = resolve(flag("out") ?? join(stats.isDirectory() ? source : dirname(source), "fitted"));
mkdirSync(outDir, { recursive: true });

async function main() {
  const ratio = (width / height).toFixed(3);
  console.log(
    `\n🖼  ${files.length} image(s) → ${width}×${height} (${ratio}:1) ${formatArg}` +
      `${compare ? ", every strategy" : ` via ${strategyArg}`}\n`,
  );

  let written = 0;
  let failed = 0;

  for (const file of files) {
    const body = readFileSync(file);
    const stem = basename(file, extname(file));
    const plan = compare ? STRATEGIES : [strategyArg];

    for (const strategy of plan) {
      const result = await fitToBox(body, {
        width,
        height,
        strategy,
        inset: insetArg,
        background: backgroundArg,
        format: formatArg,
      });

      if (!result.ok) {
        console.log(`  ❌ ${basename(file)} — ${result.error}`);
        failed += 1;
        break; // the file is unreadable; other strategies would fail identically
      }

      const name = compare ? `${stem}--${strategy}.${formatArg}` : `${stem}.${formatArg}`;
      writeFileSync(join(outDir, name), result.body);
      written += 1;

      const notes = [
        result.upscaled ? "⚠️  enlarged, will look soft" : "",
        result.requestedStrategy
          ? `↩︎ ${result.requestedStrategy} would fold the subject here, used ${result.strategy}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ");

      console.log(
        `  ✅ ${basename(file)} ${result.sourceWidth}×${result.sourceHeight}` +
          ` → ${name} (${Math.max(1, Math.round(result.body.byteLength / 1024))} KB)` +
          (notes ? `  ${notes}` : ""),
      );
    }
  }

  console.log(`\n${written} written to ${outDir}${failed ? ` · ${failed} failed` : ""}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
