import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ProfitLens dashboard client includes the MVP dashboard surface", async () => {
  const [dashboardClient, types] = await Promise.all([
    readFile(new URL("../app/dashboard-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/types.ts", import.meta.url), "utf8"),
  ]);

  assert.match(dashboardClient, /ProfitLens/);
  assert.match(dashboardClient, /ยอดขายรวม/);
  assert.match(dashboardClient, /กำไรจริง/);
  assert.match(dashboardClient, /ค้างรับ/);
  assert.match(dashboardClient, /ค้างจ่าย/);
  assert.match(types, /type TransactionType/);
  assert.match(types, /owner_contribution/);
  assert.match(types, /allocations/);
  assert.doesNotMatch(dashboardClient, /localStorage/);
});

test("ProfitLens page.tsx is a real auth-gated entry point", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /requireUser/);
  assert.match(page, /force-dynamic/);
});

test("project is configured for Vercel-compatible Next builds", async () => {
  const [layout, packageJson, vercelConfig] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /title:\s*"ProfitLens"/);
  assert.match(layout, /<html lang="th">/);
  assert.match(packageJson, /"build": "next build"/);
  assert.match(packageJson, /"dev": "next dev"/);
  assert.match(vercelConfig, /"framework": "nextjs"/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|@cloudflare\/vite-plugin/);
});
