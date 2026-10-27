import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidEmail,
  getBrevoSender,
  generateCoachingReportEmailHtml,
  sendBrevoEmail,
} from "../src/lib/server/brevo.ts";

test("isValidEmail: validates correctly", () => {
  assert.equal(isValidEmail("player@example.com"), true);
  assert.equal(isValidEmail("admin@basecamppadel.id"), true);
  assert.equal(isValidEmail("invalid-email"), false);
  assert.equal(isValidEmail(""), false);
});

test("getBrevoSender: returns configured sender", () => {
  const sender = getBrevoSender();
  assert.ok(sender.email.includes("@"));
  assert.ok(sender.name.length > 0);
});

test("generateCoachingReportEmailHtml: produces styled HTML email with content and links", () => {
  const html = generateCoachingReportEmailHtml({
    playerName: "Andi Pratama",
    coachName: "Alex",
    sessionTitle: "Clinic Sabtu Pagi",
    sessionDate: "2026-10-24",
    evaluation: "Vibora akurat dan konsisten.",
    nextPractice: "Bandeja silang ke sudut.",
  });

  assert.ok(html.includes("Andi Pratama"));
  assert.ok(html.includes("Clinic Sabtu Pagi"));
  assert.ok(html.includes("Coach Alex"));
  assert.ok(html.includes("Vibora akurat dan konsisten."));
  assert.ok(html.includes("Bandeja silang ke sudut."));
  assert.ok(html.includes("https://www.basecamppadel.id/akun?tab=catatan"));
  assert.ok(html.includes("Yang udah oke"));
  assert.ok(html.includes("Fokus sesi berikutnya"));
  assert.ok(html.includes("Lihat rapor lengkap"));
  assert.ok(html.includes("Basecamp Padel"));
});

test("sendBrevoEmail: rejects when API key is missing", async () => {
  const origKey = process.env.BREVO_API_KEY;
  delete process.env.BREVO_API_KEY;

  try {
    const res = await sendBrevoEmail({
      to: "test@example.com",
      subject: "Test",
    });

    assert.equal(res.success, false);
    assert.ok(res.error?.includes("BREVO_API_KEY"));
  } finally {
    process.env.BREVO_API_KEY = origKey;
  }
});

test("sendBrevoEmail: rejects when recipient email is invalid", async () => {
  const origKey = process.env.BREVO_API_KEY;
  process.env.BREVO_API_KEY = "dummy_key";

  try {
    const res = await sendBrevoEmail({
      to: "not-an-email",
      subject: "Test",
    });

    assert.equal(res.success, false);
    assert.ok(res.error?.includes("Alamat email tidak valid"));
  } finally {
    process.env.BREVO_API_KEY = origKey;
  }
});
