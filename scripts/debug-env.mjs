import fs from "fs";
import path from "path";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env");

console.log("cwd:", cwd);
console.log(".env exists:", fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath);
  console.log("bytes:", raw.length);
  console.log("first bytes:", [...raw.slice(0, 8)]);
  const text = raw.toString("utf8");
  const hasUrl = text.includes("VITE_SUPABASE_URL=");
  const hasKey = text.includes("VITE_SUPABASE_ANON_KEY=");
  console.log("contains URL line:", hasUrl);
  console.log("contains KEY line:", hasKey);
  const urlLine = text.split("\n").find((l) => l.startsWith("VITE_SUPABASE_URL="));
  console.log("URL line length:", urlLine?.length ?? 0);
  console.log("URL has value:", Boolean(urlLine && urlLine.length > "VITE_SUPABASE_URL=".length));
}
