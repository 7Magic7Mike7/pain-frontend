import { defineConfig } from "vite";

const API_PORT = Number(process.env.PAIN_API_PORT ?? 3947);
const WEB_PORT = Number(process.env.PAIN_WEB_PORT ?? 5174);

export default defineConfig({
  server: {
    port: WEB_PORT,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
