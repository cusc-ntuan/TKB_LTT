import assert from "node:assert/strict";
import test from "node:test";
import { heartbeat } from "../src/lib/presence.js";

test("counts unique active clients", () => {
  const clientId = `test-${Date.now()}-${Math.random()}`;

  assert.equal(heartbeat(clientId), 1);
  assert.equal(heartbeat(clientId), 1);
});

test("rejects a missing client id", () => {
  assert.throws(() => heartbeat(), /Thiếu mã phiên trực tuyến/);
});
