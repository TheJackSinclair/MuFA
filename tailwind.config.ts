import type { Config } from "tailwindcss";

export default {
    content: [
        "./app/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                forest: {
                    50: "#f3f7f5",
                    100: "#e3ebe7",
                    300: "#9fb8ac",
                    500: "#3f6f5b",
                    700: "#2f5546",
                    900: "#1f3a30"
                }
            }
        }
    },
    plugins: []
} satisfies Config;
