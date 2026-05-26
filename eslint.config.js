import globals from "globals";

const rules = {
  "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  eqeqeq: ["error", "always"],
  "no-var": "error",
  "prefer-const": "error",
  "no-dupe-keys": "error",
  "no-empty": "error",
  "no-unreachable": "error",
};

export default [
  {
    ignores: ["node_modules/**", "frontend/uploads/**"],
  },
  {
    files: ["backend/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules,
  },
  {
    files: ["frontend/js/**/*.js", "frontend/admin/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...rules,
      "no-unused-vars": "off",
    },
  },
];
