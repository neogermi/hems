import globals from "globals";
import babelParser from "@babel/eslint-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [...compat.extends("airbnb", "prettier"), {
    plugins: {},

    languageOptions: {
        globals: {
            ...globals.node,
            process: true,
        },

        parser: babelParser,
        ecmaVersion: 12,
        sourceType: "module",

        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },

            requireConfigFile: false,
        },
    },

    settings: {},

    rules: {
        "object-curly-newline": 0,
        "security/detect-object-injection": 0,
        "no-underscore-dangle": 0,
        "no-plusplus": 0,
        "import/order": 0,
        "import/prefer-default-export": 1,
        "import/no-named-as-default-member": 0,
        "arrow-parens": 0,
        "no-mixed-operators": 0,
        "operator-linebreak": 0,
        "max-len": 0,
        "no-param-reassign": 0,
        "arrow-body-style": 0,
        "consistent-return": 0,
        "no-return-assign": 0,
        "no-bitwise": 0,
        "new-cap": 1,
        "no-unused-vars": 1,

        "comma-dangle": ["error", {
            arrays: "always-multiline",
            objects: "always-multiline",
            imports: "always-multiline",
            exports: "always-multiline",
            functions: "never",
        }],
    },
}];