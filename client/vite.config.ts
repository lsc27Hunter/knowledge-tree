import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { watch } from "chokidar";
import { exec } from "child_process";
import { promisify, styleText } from "util";
import fs from "fs/promises";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiBindings()],
  server: {
    proxy: {
      "/api": {
        target: `http://localhost:8000`,
        changeOrigin: true,
        secure: false,
      },
    },
    // watch: {
    //   ignored: "src/api"
    // }
  },
});

const execAsync = promisify(exec);

function apiBindings(): Plugin {
  return {
    name: "apiBindings",
    async buildStart() {
      let lastGenerated;
      try {
        lastGenerated = (await fs.stat("src/api/openapi.json")).mtimeMs;
      } catch (e) {
        if (e !== null && typeof e === "object" && "code" in e && e.code === "ENOENT") {
          // File not found.
          lastGenerated = null;
        } else {
          throw e;
        }
      }
      const apiDir = "../api/src";
      const changed = lastGenerated === null || await filesChanged(apiDir, lastGenerated);
      if (changed) {
        console.log(`${styleText("magenta", "[api]")} Generating api bindings...`);
        await execAsync('npm run gen-api-bindings --include-workspace-root --if-present');
      }
    },
    configureServer(server) {
      const watchDir = '../api/src';
      const watcher = watch(watchDir, { ignoreInitial: true, ignored: [`${watchDir}/__pycache__`] });
      
      watcher.on('change', async path => {
        await execAsync('npm run gen-api-bindings --include-workspace-root --if-present');
        const time = new Date().toLocaleTimeString()
        console.log(`${styleText("gray", time)} ${styleText("magenta", "[api]")} ${styleText("green", "update")} ${styleText("gray", path)}`);
        // server.ws.send({ type: 'full-reload' });
      });

      server.httpServer?.on('close', () => {
        watcher.close();
      });
    },
  };
}

async function filesChanged(dir: string, since: number) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (filePath.endsWith("__pycache__")) continue;
    if (file.isDirectory()) {
      const changed = await filesChanged(filePath, since);
      if (changed) return true;
    } else if (file.isFile()) {
      const stat = await fs.stat(filePath);
      if (stat.mtimeMs > since) return true;
    }
  }
  return false;
}