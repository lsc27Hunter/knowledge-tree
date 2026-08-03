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
        configure: (proxy) => {
          // Keep the original Host so azp checks still see localhost:5173.
          proxy.on("proxyReq", (proxyReq, req) => {
            const host = req.headers.host;
            if (typeof host === "string" && host.length > 0) {
              proxyReq.setHeader("X-Forwarded-Host", host);
            }
          });
        },
      },
    },
    watch: {
      // Generated bindings; watching them causes noisy HMR mid-request.
      ignored: ["**/src/api/**"],
    },
  },
});

const execAsync = promisify(exec);

function apiBindings(): Plugin {
  return {
    name: "apiBindings",
    async buildStart() {
      let lastGenerated;
      try {
        lastGenerated = (await fs.stat("openapi.json")).mtimeMs;
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
        await generateApiBindings();
      }
    },
    configureServer(server) {
      const watchDir = '../api/src';
      const watcher = watch(watchDir, { ignoreInitial: true, ignored: [/(^|[\/\\])__pycache__([\/\\]|$)/],  });

      let t1 = Date.now();
      let queuedPaths = new Set();
      watcher.on('change', async path => {
        const t2 = Date.now();
        t1 = t2;
        setTimeout(async () => {
          if (t1 !== t2) {
            queuedPaths.add(path);
            return;
          }
          const paths = queuedPaths;
          paths.add(path);
          const success = await tryGenerateApiBindings();
        
          const time = new Date().toLocaleTimeString()
          if (success) {
            console.log(`${styleText("gray", time)} ${styleText("magenta", "[api]")} ${styleText("green", "update")} ${styleText("gray", [...paths.values()].join(", "))}`);
          } else {
            console.log(`${styleText("gray", time)} ${styleText("red", "[api]")} error, waiting for next update...`);
          }
        }, 10);
        // server.ws.send({ type: 'full-reload' });
      });

      server.httpServer?.on('close', () => {
        watcher.close();
      });
    },
  };
}

// Returns whether the command succeeded.
async function tryGenerateApiBindings() {
  try {
    await generateApiBindings();
    return true;
  } catch (_) {
    return false;
  }
}

async function generateApiBindings() {
  await execAsync('npm run gen-api-bindings --include-workspace-root --if-present');
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