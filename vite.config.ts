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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
            },
            {
              name: "vendor-supabase",
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            },
            {
              name: "vendor-pdfjs",
              test: /[\\/]node_modules[\\/]pdfjs-dist[\\/]/,
            },
            {
              name: "vendor-ocr",
              test: /[\\/]node_modules[\\/](@paddleocr|onnxruntime-web)[\\/]/,
            },
            {
              name: "vendor-dxf",
              test: /[\\/]node_modules[\\/]@tarikjabiri[\\/]/,
            },
          ],
        },
      },
    },
  },
});
