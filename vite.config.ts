import { createRequire } from "node:module";
import { dirname, relative } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

// Self-host the tesseract.js worker + core (wasm). Resolved relative to the
// installed packages so it works regardless of the package manager's layout.
// Only the language data (eng.traineddata) is fetched from a CDN at runtime.
// Paths are made relative to the project root so vite-plugin-static-copy
// flattens them into dist/tesseract instead of preserving node_modules/.
const require = createRequire(import.meta.url);
const tesseractDir = dirname(require.resolve("tesseract.js/package.json"));
const coreDir = relative(
	process.cwd(),
	dirname(
		require.resolve("tesseract.js-core/package.json", {
			paths: [tesseractDir],
		}),
	),
);
const workerFile = relative(
	process.cwd(),
	require.resolve("tesseract.js/dist/worker.min.js"),
);

// https://vite.dev/config/
export default defineConfig({
	base: "/",
	plugins: [
		react(),
		tailwindcss(),
		viteStaticCopy({
			targets: [
				{
					src: `${coreDir}/*.{wasm,js}`,
					dest: "tesseract",
					rename: { stripBase: true },
				},
				{ src: workerFile, dest: "tesseract", rename: { stripBase: true } },
			],
		}),
	],
});
