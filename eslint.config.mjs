import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  {
    ignores: [".next/**", "node_modules/**", "src/generated/**", "playwright-report/**", "test-results/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // One-off data import scripts parse loosely-typed third-party JSON.
    files: ["scripts/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
];
