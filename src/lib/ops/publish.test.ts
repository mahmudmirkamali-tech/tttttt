import assert from "node:assert/strict";
import test from "node:test";
import { claimAllowed, interpretTelegram, isOwnerEmail, scrubSecret } from "./publish.ts";

test("only an approved telegram row without a message id can be claimed", () => {
  assert.equal(claimAllowed("approved", "telegram", null), true);
  assert.equal(claimAllowed("draft", "telegram", null), false);
  assert.equal(claimAllowed("sent", "telegram", null), false);
  assert.equal(claimAllowed("approved", "instagram", null), false);
  assert.equal(claimAllowed("approved", "telegram", "44"), false);
});

test("telegram success requires the API message id", () => {
  assert.deepEqual(interpretTelegram(200, { ok: true, result: { message_id: 9 } }), {
    ok: true,
    messageId: "9",
  });
  assert.equal(interpretTelegram(200, { ok: true, result: {} }).ok, false);
  assert.equal(interpretTelegram(400, { ok: false, description: "chat not found" }).ok, false);
});

test("bot token is stripped from stored errors", () => {
  assert.equal(scrubSecret("bad 123:ABC token", "123:ABC"), "bad •••• token");
});

test("only the configured owner email passes the owner gate", () => {
  assert.equal(isOwnerEmail("Owner@Gmail.com", "owner@gmail.com"), true);
  assert.equal(isOwnerEmail("other@gmail.com", "owner@gmail.com"), false);
  assert.equal(isOwnerEmail(null, "owner@gmail.com"), false);
  assert.equal(isOwnerEmail("owner@gmail.com", undefined), false);
  assert.equal(isOwnerEmail("owner@gmail.com", "  "), false);
});
