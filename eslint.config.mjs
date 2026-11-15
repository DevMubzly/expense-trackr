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
    // Vendored shadcn-registry source (beUI + bklit). Copy-paste code we do not
    // edit, so its hooks rules are not ours to police.
    "src/components/motion/**",
    "src/components/charts/**",
  ]),
]);

export default eslintConfig;
