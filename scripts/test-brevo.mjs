import { sendBrevoEmail, checkBrevoStatus } from "../src/lib/server/brevo.ts";

async function main() {
  const targetEmail = process.argv[2] || "jamaludinak46@gmail.com";
  console.log(`=== Testing Brevo Integration ===`);
  console.log(`Checking Brevo Status...`);
  
  const status = await checkBrevoStatus();
  console.log("Brevo Status:", status);

  if (!status.configured) {
    console.error("\n[ERROR] Akun Brevo belum terkonfigurasi atau autentikasi gagal:", status.error);
    process.exit(1);
  }

  console.log(`\nMengirim email uji coba ke: ${targetEmail}...`);
  const result = await sendBrevoEmail({
    to: targetEmail,
    subject: "Tes Konfigurasi Brevo — Basecamp Padel",
    textContent: "Halo Jamaludin! Ini adalah email tes dari sistem Basecamp Padel via Brevo API.",
    htmlContent: `
      <div style="font-family: sans-serif; padding: 20px; background-color: #0E0C15; color: #FBF7F1; border-radius: 8px;">
        <h2 style="color: #FFD43B;">🎾 Tes Email Brevo Berhasil!</h2>
        <p>Halo <strong>Jamaludin</strong>,</p>
        <p>Email ini dikirim untuk menguji konfigurasi <code>BREVO_API_KEY</code> di aplikasi <strong>Basecamp Padel</strong>.</p>
        <hr style="border-color: rgba(251,247,241,0.2);" />
        <p style="font-size: 12px; color: rgba(251,247,241,0.6);">Dikirim pada: ${new Date().toLocaleString("id-ID")}</p>
      </div>
    `,
  });

  console.log("Send Result:", result);

  if (!result.success) {
    console.error("\n[ERROR] Gagal mengirim email:", result.error);
    process.exit(1);
  }

  console.log(`\n[SUKSES] Email berhasil terkirim ke ${targetEmail}! Message ID: ${result.messageId}`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
