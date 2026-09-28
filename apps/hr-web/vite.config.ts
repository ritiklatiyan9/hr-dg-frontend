import { fileURLToPath } from "node:url";
import { defineConfig, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// The browser stays on the Vite origin so session and CSRF cookies remain same-origin.
const api = new URL(process.env.DG_API_PROXY ?? "https://hr-dg-backend.onrender.com");
const proxy: ProxyOptions = {
  target: api.origin,
  changeOrigin: true,
  configure: (server) => {
    server.on("proxyReq", (request, incoming) => {
      if (incoming.headers.origin) request.setHeader("origin", api.origin);
    });
  },
};
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      "/payroll": proxy,
      "/dwr": proxy,
      "/files": proxy,
      "/profile": proxy,
      "/analytics": proxy,
      "/auth": proxy,
      "/graphql": proxy,
      "/health": proxy,
    },
  },
});
