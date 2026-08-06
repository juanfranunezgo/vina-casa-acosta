import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worktrees of other branches living inside the working dir. They are not
    // this project's source and they contributed every one of the 227 errors
    // that made `npm run lint` unreadable — a gate that always screams is a gate
    // nobody reads.
    ".claude/**",
  ]),
]);

export default eslintConfig;
