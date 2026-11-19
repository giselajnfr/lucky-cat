import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },   // same "@/..." imports as the app
  test: { include: ["lib/**/*.test.ts"] },
});
