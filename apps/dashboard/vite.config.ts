import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { potatoDevSession } from "./vite-potato-dev.js";

export default defineConfig({
  plugins: [react(), potatoDevSession()],
  server: { host: "127.0.0.1", port: 5173 },
});
