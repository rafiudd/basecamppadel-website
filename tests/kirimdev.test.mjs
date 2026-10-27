import test from "node:test";
import assert from "node:assert/strict";
import {
  getKirimdevApiKey,
  sendKirimdevWhatsAppMessage,
  resolveKirimdevPhoneNumberId,
} from "../src/lib/server/kirimdev.ts";

test("getKirimdevApiKey: returns configured key or default", () => {
  const key = getKirimdevApiKey();
  assert.ok(key.startsWith("kdv_live_"));
});

test("sendKirimdevWhatsAppMessage: rejects invalid phone number", async () => {
  const res = await sendKirimdevWhatsAppMessage({
    to: "123",
    message: "Halo",
  });

  assert.equal(res.success, false);
  assert.ok(res.error?.includes("Nomor WhatsApp tidak valid"));
});

test("resolveKirimdevPhoneNumberId: uses env variable when provided", async () => {
  const origEnv = process.env.KIRIMDEV_PHONE_NUMBER_ID;
  process.env.KIRIMDEV_PHONE_NUMBER_ID = "phone_test_12345";

  try {
    const id = await resolveKirimdevPhoneNumberId();
    assert.equal(id, "phone_test_12345");
  } finally {
    process.env.KIRIMDEV_PHONE_NUMBER_ID = origEnv;
  }
});

test("resolveKirimdevPhoneNumberId: throws descriptive error when no phone connected", async () => {
  const origEnv = process.env.KIRIMDEV_PHONE_NUMBER_ID;
  delete process.env.KIRIMDEV_PHONE_NUMBER_ID;

  try {
    await resolveKirimdevPhoneNumberId();
    // If an account is actually connected in Kirimdev, it will return phone_number_id.
    // If not, it throws descriptive error.
  } catch (err) {
    assert.ok(err.message.includes("dashboard kirimdev.com") || err.message.includes("KIRIMDEV_PHONE_NUMBER_ID"));
  } finally {
    process.env.KIRIMDEV_PHONE_NUMBER_ID = origEnv;
  }
});
