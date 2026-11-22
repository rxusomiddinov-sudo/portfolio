const fs = require("fs");
const path = require("path");

function readEnvFile() {
  const result = {};
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return result;

  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.charAt(0) === "#") return;
      const separator = trimmed.indexOf("=");
      if (separator === -1) return;

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.charAt(0) === '"' && value.slice(-1) === '"') ||
        (value.charAt(0) === "'" && value.slice(-1) === "'")
      ) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    });

  return result;
}

const env = Object.assign({}, readEnvFile(), process.env);
const url = env.SUPABASE_URL || "";
const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "";
const output =
  "window.PORTFOLIO_CONFIG = Object.assign({}, window.PORTFOLIO_CONFIG || {}, {\n" +
  "  supabaseUrl: " +
  JSON.stringify(url) +
  ",\n" +
  "  supabaseAnonKey: " +
  JSON.stringify(key) +
  "\n" +
  "});\n";

fs.writeFileSync(path.join(__dirname, "portfolio-config.local.js"), output);
