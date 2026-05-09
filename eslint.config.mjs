import nextVitals from "eslint-config-next/core-web-vitals.js";
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });
const config = [
  ...compat.config(nextVitals),
  {
    ignores: [".next/**", "node_modules/**"],
  },
];

export default config;
