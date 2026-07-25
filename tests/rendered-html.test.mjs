import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders ProfitLens dashboard content", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="th">/i);
  assert.match(html, /<title>ProfitLens<\/title>/i);
  assert.match(html, /ProfitLens/);
  assert.match(html, /กำไรจริงรวม/);
  assert.match(html, /เงินสดคงเหลือ/);
  assert.match(html, /ค้างรับ/);
  assert.match(html, /ค้างจ่าย/);
  assert.match(html, /ธุรกิจ A/);
  assert.match(html, /ธุรกิจ B/);
  assert.match(html, /เพิ่มรายการ/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton|codex-preview/i);
});

test("removes starter preview surface and dependency", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type TransactionType/);
  assert.match(page, /owner_contribution/);
  assert.match(page, /allocations/);
  assert.match(layout, /title:\s*"ProfitLens"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /SkeletonPreview|_sites-preview/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
