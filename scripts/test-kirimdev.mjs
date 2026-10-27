import { sendKirimdevWhatsAppMessage, checkKirimdevStatus } from "../src/lib/server/kirimdev.ts";

async function main() {
  const targetNumber = process.argv[2] || "087761198115";
  console.log(`=== Testing Kirimdev WhatsApp Integration ===`);
  console.log(`Checking Kirimdev Status...`);

  const status = await checkKirimdevStatus();
  console.log("Kirimdev Status:", status);

  const hasConnectedAccount = status.accounts.some((acc) => acc.status === "connected");
  if (!status.configured || !hasConnectedAccount) {
    console.error("\n[ERROR] Nomor WhatsApp di Kirimdev belum terhubung!");
    process.exit(1);
  }

  console.log(`\nMengirim pesan WhatsApp ke: ${targetNumber}...`);
  const result = await sendKirimdevWhatsAppMessage({
    to: targetNumber,
    message: "Halo! Ini adalah pesan uji coba dari sistem Basecamp Padel via Kirimdev WhatsApp Gateway. 🎾",
  });

  console.log("Send Result:", result);

  if (!result.success) {
    console.error("\n[ERROR] Gagal mengirim pesan WhatsApp:", result.error);
    process.exit(1);
  }

  console.log(`\n[SUKSES] Pesan WhatsApp berhasil dikirim ke ${targetNumber}!`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
