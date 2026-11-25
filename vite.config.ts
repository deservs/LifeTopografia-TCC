import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    proxy: { "/api": { target: "http://localhost:3001", changeOrigin: true } },
  },
  build: {
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter((dep) => !dep.includes("vendor-ocr")),
    },
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              priority: 30,
              test: (id) =>
                /[\\/]node_modules[\\/](react|react-dom|react-router-dom|scheduler|react-compiler-runtime)[\\/]/.test(
                  id,
                ) || id.includes("preload-helper"),
            },
            {
              name: "vendor-supabase",
              priority: 20,
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            },
            {
              name: "vendor-pdfjs",
              priority: 10,
              test: /[\\/]node_modules[\\/]pdfjs-dist[\\/]/,
            },
            {
              name: "vendor-ocr",
              priority: 10,
              test: /[\\/]node_modules[\\/](@paddleocr|onnxruntime-web)[\\/]/,
            },
            {
              name: "vendor-dxf",
              priority: 10,
              test: /[\\/]node_modules[\\/]@tarikjabiri[\\/]/,
            },
          ],
        },
      },
    },
  },
});
