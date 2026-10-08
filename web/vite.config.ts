import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const api = "http://localhost:3000";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { "/products": api, "/incidents": api, "/meta": api, "/config": api, "/health": api },
  },
});
