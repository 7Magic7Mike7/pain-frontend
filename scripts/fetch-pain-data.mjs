/**
 * Re-download public CSV slices from github.com/7Magic7Mike7/pain (data/).
 * Run: npm run fetch:data
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const BASE =
  "https://raw.githubusercontent.com/7Magic7Mike7/pain/main/data";

const FILES = [
  "env_earth.csv",
  "gini-coefficient-by-country-2025.csv",
  "painful_disease_prevalence_vs_environment.csv",
  "emotional.csv",
  "conflict-deaths-by-country.csv",
  "physical-pain.csv",
  "opiate-usage-by-country-2025.csv",
];

fs.mkdirSync(DATA, { recursive: true });

for (const name of FILES) {
  const url = `${BASE}/${name}`;
  const dest = path.join(DATA, name);
  process.stdout.write(`${name} … `);
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`skip (${res.status})`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  console.log(`${buf.length} bytes`);
}

console.log("Done. Data dir:", DATA);
