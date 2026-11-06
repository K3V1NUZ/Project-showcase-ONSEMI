import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // `react-hooks/set-state-in-effect` (new in eslint-config-next 16 /
    // React 19) flags the deliberate SSR/CSR hydration workaround
    // — deferring `new Date()` and
    // theme/localStorage reads to a useEffect so server and client
    // render match on first paint. Disabled globally rather than
    // suppressed inline in 8 places.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
