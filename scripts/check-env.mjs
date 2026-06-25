import { loadEnv } from "vite";

const env = loadEnv("development", process.cwd(), "");
console.log("URL:", env.VITE_SUPABASE_URL ? "OK" : "MISSING");
console.log("KEY:", env.VITE_SUPABASE_ANON_KEY ? "OK" : "MISSING");
