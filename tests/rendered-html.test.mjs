import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ProfitLens source includes the MVP dashboard surface", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /ProfitLens/);
  assert.match(page, /กำไรจริงรวม/);
  assert.match(page, /เงินสดคงเหลือ/);
  assert.match(page, /ค้างรับ/);
  assert.match(page, /ค้างจ่าย/);
  assert.match(page, /type TransactionType/);
  assert.match(page, /owner_contribution/);
  assert.match(page, /allocations/);
  assert.match(page, /localStorage/);
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
