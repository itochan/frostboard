import { createRequire } from "node:module";
import { dirname, relative } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, normalizePath } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

// Self-host the tesseract.js worker + core (wasm) + language data. Resolved
// relative to the installed packages so it works regardless of the package
// manager's layout. Nothing is fetched from a CDN at runtime.
// Paths are made relative to the project root so vite-plugin-static-copy
// flattens them into dist/tesseract instead of preserving node_modules/.
const require = createRequire(import.meta.url);
const tesseractDir = dirname(require.resolve("tesseract.js/package.json"));
const coreDir = normalizePath(
	relative(
		process.cwd(),
		dirname(
			require.resolve("tesseract.js-core/package.json", {
				paths: [tesseractDir],
			}),
		),
	),
);
const workerFile = normalizePath(
	relative(process.cwd(), require.resolve("tesseract.js/dist/worker.min.js")),
);
// The `4.0.0_best_int` subdir is the integer-quantized "best" LSTM model
// (~2.8 MB vs ~10.4 MB for standard `4.0.0`). We run OEM=1 (LSTM only), so the
// legacy engine in the standard model is dead weight; this is tesseract.js's
// own default for lstmOnly. Switch to `4.0.0` for the standard integer model.
const langFile = normalizePath(
	relative(
		process.cwd(),
		require.resolve("@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz"),
	),
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
				{
					src: langFile,
					dest: "tesseract/lang",
					rename: { stripBase: true },
				},
			],
		}),
	],
});
