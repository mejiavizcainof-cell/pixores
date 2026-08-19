import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["components/ThumbnailEditorV2.tsx"],
    rules: {
      // This legacy editor predates the React Compiler rules. Keep the findings
      // visible while preventing them from obscuring release-blocking errors.
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "release*/**",
    "output/**",
    ".tmp-*/**",
    "tmp-*/**",
    "public/uploads/**",
    "public/pdf.worker.min.mjs",
    "public/video-maker-assets/mediapipe/wasm/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
