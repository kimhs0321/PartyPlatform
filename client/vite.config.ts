import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],

  publicDir: fileURLToPath(
    new URL("../ulsan-marble/public", import.meta.url),
  ),

  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "three",
      "@react-three/fiber",
    ],

    alias: {
      react: fileURLToPath(
        new URL("./node_modules/react", import.meta.url),
      ),

      "react-dom": fileURLToPath(
        new URL("./node_modules/react-dom", import.meta.url),
      ),

      three: fileURLToPath(
        new URL("./node_modules/three", import.meta.url),
      ),

      "@react-three/fiber": fileURLToPath(
        new URL(
          "./node_modules/@react-three/fiber",
          import.meta.url,
        ),
      ),
    },
  },
});