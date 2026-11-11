// Checks that Callout Studio refuses requests that don't come from its own page.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { isAllowedRequest, localOnly } from "./local-only.ts";

test("only localhost:PORT and 127.0.0.1:PORT are answered", () => {
  assert.ok(isAllowedRequest("localhost:4710", undefined, 4710));
  assert.ok(isAllowedRequest("127.0.0.1:4710", undefined, 4710));
  assert.ok(isAllowedRequest("LOCALHOST:4710", undefined, 4710));
  assert.ok(!isAllowedRequest("evil.example.com", undefined, 4710));
  assert.ok(!isAllowedRequest("evil.example.com:4710", undefined, 4710));
  assert.ok(!isAllowedRequest("localhost", undefined, 4710), "port is required");
  assert.ok(!isAllowedRequest("localhost:4711", undefined, 4710));
  assert.ok(!isAllowedRequest("192.168.1.20:4710", undefined, 4710));
  assert.ok(!isAllowedRequest(undefined, undefined, 4710));
});

test("an Origin from any other address is refused", () => {
  assert.ok(isAllowedRequest("localhost:4710", "http://localhost:4710", 4710));
  assert.ok(isAllowedRequest("localhost:4710", "http://127.0.0.1:4710", 4710));
  assert.ok(!isAllowedRequest("localhost:4710", "https://evil.example.com", 4710));
  assert.ok(!isAllowedRequest("localhost:4710", "http://localhost:3000", 4710));
  assert.ok(!isAllowedRequest("localhost:4710", "https://localhost:4710", 4710));
  assert.ok(!isAllowedRequest("localhost:4710", "null", 4710));
  assert.ok(!isAllowedRequest("localhost:4710", "", 4710));
});

// The same checks through a real web server, the way the browser would hit it.
test("the server answers 403 to a wrong Host or a foreign Origin", async () => {
  const app = express();
  let port = 0;
  app.use((req, res, next) => localOnly(port)(req, res, next));
  app.get("/api/jobs", (_req, res) => {
    res.json([]);
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  port = (server.address() as AddressInfo).port;

  const status = (headers: Record<string, string>) =>
    new Promise<number>((resolve, reject) => {
      http
        .get({ host: "127.0.0.1", port, path: "/api/jobs", headers }, (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        })
        .on("error", reject);
    });

  try {
    assert.equal(await status({ Host: `localhost:${port}` }), 200);
    assert.equal(await status({ Host: `127.0.0.1:${port}` }), 200);
    assert.equal(await status({ Host: `localhost:${port}`, Origin: `http://localhost:${port}` }), 200);
    assert.equal(await status({ Host: "evil.example.com" }), 403);
    assert.equal(await status({ Host: `evil.example.com:${port}` }), 403);
    assert.equal(await status({ Host: `localhost:${port}`, Origin: "https://evil.example.com" }), 403);
  } finally {
    server.close();
  }
});
