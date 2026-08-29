import { existsSync, readFileSync } from "node:fs";
import { sites } from "@openai/sites-vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

// `.openai/hosting.json` 只在部署云端（openai sites sync）时生成。
// 本地游玩不依赖它，缺失时退回空绑定，保证全新副本可以直接启动。
const hostingConfigPath = new URL("./.openai/hosting.json", import.meta.url);
const hostingConfig = existsSync(hostingConfigPath)
  ? (JSON.parse(readFileSync(hostingConfigPath, "utf8")) as { d1?: string; r2?: string })
  : {};
const { r2 } = hostingConfig;

// 存档层读取的是 `env.DB`，因此本地缺失 hosting.json 时默认提供名为 DB 的 D1 绑定。
const d1 = hostingConfig.d1 ?? "DB";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      // 不要监视本地运行状态目录：miniflare 每次写 D1 存档都会改动
      // .wrangler 下的 sqlite 文件，被监视会导致整页无谓重载甚至内存耗尽。
      watch: {
        ignored: ["**/.wrangler/**", "**/.openai/**", "**/dist/**"],
        ...(isCodexSeatbeltSandbox ? { useFsEvents: false, usePolling: true } : {}),
      },
    },
    plugins: [
      vinext(),
      // sites() 是云端部署插件，会在 closeBundle 时复制 .openai 目录；
      // 本地游玩没有该目录时不应启用，避免 ENOENT。
      ...(existsSync(hostingConfigPath) ? [sites()] : []),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
