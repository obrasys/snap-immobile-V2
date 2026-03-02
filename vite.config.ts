import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  envPrefix: 'VITE_',
  define: {
    // Garante que as variáveis de ambiente do processo sejam injetadas no import.meta.env
    'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY || ""),
    'import.meta.env.VITE_API_KEY': JSON.stringify(process.env.VITE_API_KEY || process.env.VITE_GEMINI_API_KEY || ""),
  },
}));