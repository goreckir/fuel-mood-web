import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import license from "rollup-plugin-license";
import { defineConfig } from "vite";

// GitHub Pages serves the site under /<repo>/; the Pages workflow sets BASE_PATH, local dev stays at /.
export default defineConfig({
    base: process.env.BASE_PATH ?? "/",
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { "@": resolve(import.meta.dirname, "src") },
    },
    worker: { format: "es" }, // MapLibre starts its worker as a module worker
    build: {
        chunkSizeWarningLimit: 1500, // MapLibre alone is ~1 MB minified
        rollupOptions: {
            plugins: [
                // Ships third-party licence texts (MapLibre's BSD-3 notice is required) as dist/THIRD_PARTY_NOTICES.txt.
                license({
                    thirdParty: {
                        multipleVersions: true,
                        output: {
                            file: resolve(import.meta.dirname, "dist", "THIRD_PARTY_NOTICES.txt"),
                            template: (dependencies) => dependencies
                                .map((dep) => [`${dep.name}@${dep.version}`, `License: ${dep.license ?? "UNKNOWN"}`, "", dep.licenseText?.trim() ?? ""].join("\n"))
                                .join(`\n\n${"=".repeat(60)}\n\n`),
                        },
                    },
                }),
            ],
        },
    },
});
