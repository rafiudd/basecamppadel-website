// Run: npm test  (node --test with TypeScript type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import { accountStep, formatWhatsapp, normalizeWhatsapp, safeNext } from "../src/lib/accountRules.ts";

test("normalizeWhatsapp: common Indonesian spellings become 628…", () => {
  assert.equal(normalizeWhatsapp("0812-3456-7890"), "6281234567890");
  assert.equal(normalizeWhatsapp("+62 812 3456 7890"), "6281234567890");
  assert.equal(normalizeWhatsapp("6281234567890"), "6281234567890");
  assert.equal(normalizeWhatsapp("81234567890"), "6281234567890");
  assert.equal(normalizeWhatsapp("(0812) 345.678"), "62812345678");
});

test("normalizeWhatsapp: rejects non-mobile, too short/long, letters", () => {
  assert.equal(normalizeWhatsapp(""), null);
  assert.equal(normalizeWhatsapp("021-555-1234"), null);
  assert.equal(normalizeWhatsapp("0812"), null);
  assert.equal(normalizeWhatsapp("081234567890123"), null);
  assert.equal(normalizeWhatsapp("0812abc4567"), null);
  assert.equal(normalizeWhatsapp("+1 415 555 0100"), null);
});

test("formatWhatsapp: stored number back to local spelling", () => {
  assert.equal(formatWhatsapp("6281234567890"), "0812-3456-7890");
});

test("safeNext: only same-site paths", () => {
  assert.equal(safeNext("/jadwal/abc?x=1"), "/jadwal/abc?x=1");
  assert.equal(safeNext(null), "/akun");
  assert.equal(safeNext("//evil.com"), "/akun");
  assert.equal(safeNext("/\\evil.com"), "/akun");
  assert.equal(safeNext("https://evil.com", "/"), "/");
});

test("accountStep", () => {
  assert.equal(accountStep(null), "profile");
  assert.equal(accountStep({ player_id: null, claim_player_id: null }), "choose");
  assert.equal(accountStep({ player_id: "p1", claim_player_id: null }), "ready");
  assert.equal(accountStep({ player_id: null, claim_player_id: "p2" }), "ready");
});
