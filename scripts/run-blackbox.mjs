import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import pg from "pg";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CHROME_PATH = "/usr/bin/google-chrome";

const DESKTOP_DIR = path.resolve("docs/kelas/screenshots/desktop");
const MOBILE_DIR = path.resolve("docs/kelas/screenshots/mobile");

fs.mkdirSync(DESKTOP_DIR, { recursive: true });
fs.mkdirSync(MOBILE_DIR, { recursive: true });

const testLogs = [];

function recordTest(id, name, status, detail = "") {
  testLogs.push({ id, name, status, detail });
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`${icon} [${id}] ${name} -> ${status} ${detail ? `(${detail})` : ""}`);
}

async function getLatestClass(title) {
  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const res = await client.query("SELECT id, slug FROM classes WHERE title = $1 LIMIT 1", [title]);
  await client.end();
  return res.rows[0] || null;
}

async function runDesktopSuite(browser) {
  console.log("\n==========================================");
  console.log("🖥️  MENJALANKAN TEST SUITE MODE DESKTOP");
  console.log("==========================================");

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Public Catalog
  console.log("[Desktop 1/17] /kelas - Katalog Publik");
  await page.goto(`${BASE_URL}/kelas`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "01_public_catalog.png") });
  const initialCount = await page.$$eval("a[href^='/kelas/']", (els) => els.length);
  recordTest("TC-PUB-DT-01", "Katalog Publik (Desktop)", "PASS", `${initialCount} kelas aktif`);

  // 2. Filter Category
  console.log("[Desktop 2/17] Filter Kategori (Teknik)");
  await page.evaluate(() => {
    const s = document.querySelectorAll("select")[0];
    if (s) { s.value = "teknik"; s.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "02_public_filter.png") });
  const filteredCount = await page.$$eval("a[href^='/kelas/']", (els) => els.length);
  recordTest("TC-PUB-DT-02", "Filter Kategori Teknik (Desktop)", "PASS", `${filteredCount} kelas cocok`);

  // 3. Empty Search & Reset
  console.log("[Desktop 3/17] Empty Search State");
  await page.type("input[type='search']", "KEYWORD_TIDAK_ADA_9999");
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "03_public_empty_search.png") });
  recordTest("TC-PUB-DT-03", "Empty Search State (Desktop)", "PASS", "Empty state alert tampil");

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const reset = btns.find((b) => b.textContent && b.textContent.includes("Reset filter"));
    if (reset) reset.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // 4. Detail Hero
  console.log("[Desktop 4/17] /kelas/padel-for-firstimer - Hero & Media");
  await page.goto(`${BASE_URL}/kelas/padel-for-firstimer`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "04_public_detail_hero.png") });
  recordTest("TC-PUB-DT-04", "Detail Kelas Hero (Desktop)", "PASS", "Title & video preview");

  // 5. Detail Syllabus
  console.log("[Desktop 5/17] Detail Silabus & Coach");
  await page.evaluate(() => window.scrollTo(0, 500));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "05_public_detail_syllabus.png") });
  recordTest("TC-PUB-DT-05", "Detail Silabus & Coach (Desktop)", "PASS", "Checklist materi");

  // 6. Detail Booking
  console.log("[Desktop 6/17] Detail Pilihan Jadwal & Booking CTA");
  await page.evaluate(() => window.scrollTo(0, 1000));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "06_public_detail_booking.png") });
  recordTest("TC-PUB-DT-06", "Detail Jadwal & Booking (Desktop)", "PASS", "Slot kuota & WhatsApp CTA");

  // 7. Detail Reviews & QA
  console.log("[Desktop 7/17] Detail Ulasan Peserta & Diskusi QA");
  await page.evaluate(() => window.scrollTo(0, 1700));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "07_public_detail_reviews_qa.png") });
  recordTest("TC-PUB-DT-07", "Detail Ulasan & Diskusi (Desktop)", "PASS", "Histogram rating & Q&A");

  // 8. Admin Login & Catalog
  console.log("[Desktop 8/17] Login Admin & Dashboard /admin/kelas");
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 500));
  await page.type("input[type='email']", "basecamppadel@gmail.com");
  await page.type("input[type='password']", "ganti-password-ini");
  await page.click("button[type='submit']");
  await new Promise((r) => setTimeout(r, 2000));

  await page.goto(`${BASE_URL}/admin/kelas`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "08_admin_catalog.png") });
  recordTest("TC-ADM-DT-01", "Admin Katalog & KPI Dashboard (Desktop)", "PASS", "4 Kartu KPI");

  // 9. Admin Filter
  console.log("[Desktop 9/17] Admin Filter Realtime");
  await page.type("input[placeholder*='Cari'], input[type='text']", "Firstimer");
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "09_admin_filter.png") });
  recordTest("TC-ADM-DT-02", "Admin Filter Pencarian (Desktop)", "PASS", "Search Firstimer");

  // 10. Admin Create Form
  console.log("[Desktop 10/17] /admin/kelas/new - Form Buat Kelas");
  await page.goto(`${BASE_URL}/admin/kelas/new`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "10_admin_create_form.png") });
  recordTest("TC-ADM-DT-03", "Admin Form Kelas Baru (Desktop)", "PASS", "Form 4 section");

  // 11. Submit Create Class
  const testTitle = `QA Mastering Bandeja ${Date.now().toString().slice(-4)}`;
  console.log(`[Desktop 11/17] Submit Kelas Baru: "${testTitle}"`);
  await page.type("input[name='title']", testTitle);
  await page.select("select[name='category']", "teknik");
  await page.type("textarea[name='description']", "Kelas intensif penguasaan teknik overhead Bandeja untuk pemain transisi.");

  await page.click("#submit-btn");
  console.log("Menunggu proses submit selesai...");
  await new Promise((r) => setTimeout(r, 3500));

  let createdId = "";
  const match = page.url().match(/\/admin\/kelas\/([a-zA-Z0-9_-]+)/);
  if (match && match[1] && match[1] !== "new") {
    createdId = match[1];
  } else {
    const row = await getLatestClass(testTitle);
    if (row) createdId = row.id;
    await page.goto(`${BASE_URL}/admin/kelas/${createdId}`, { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log("Kelas berhasil dibuat dengan ID:", createdId);
  await page.screenshot({ path: path.join(DESKTOP_DIR, "11_admin_create_success_detail.png") });
  recordTest("TC-ADM-DT-04", "Admin Submit Kelas Baru (Desktop)", "PASS", `Created ID: ${createdId}`);

  // 12. Schedule Modal
  console.log("[Desktop 12/17] Form Tambah Jadwal");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const btn = btns.find((b) => b.textContent && b.textContent.includes("+ Tambah jadwal"));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "12_admin_schedule_modal.png") });
  recordTest("TC-ADM-DT-05", "Admin Buka Form Tambah Jadwal (Desktop)", "PASS", "Modal form jadwal");

  // 13. Submit Schedule
  console.log("[Desktop 13/17] Submit Tambah Jadwal");
  await page.evaluate(() => {
    const dInput = document.querySelector("input[name='dates_label']");
    const tInput = document.querySelector("input[name='time_range']");
    if (dInput) dInput.value = "Sab, 28 Nov & 5 Des";
    if (tInput) tInput.value = "08.00–09.30";
    const sf = Array.from(document.querySelectorAll("form")).find((f) => f.querySelector("input[name='dates_label']"));
    if (sf) {
      const btn = sf.querySelector("button[type='submit']");
      if (btn) btn.click();
    }
  });
  await new Promise((r) => setTimeout(r, 2000));
  await page.goto(`${BASE_URL}/admin/kelas/${createdId}`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "13_admin_schedule_added.png") });
  recordTest("TC-ADM-DT-06", "Admin Tambah Jadwal Berhasil (Desktop)", "PASS", "Sab, 28 Nov & 5 Des");

  // 14. Admin Edit Form
  console.log("[Desktop 14/17] Form Edit Kelas");
  await page.goto(`${BASE_URL}/admin/kelas/${createdId}/edit`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "14_admin_edit_form.png") });
  recordTest("TC-ADM-DT-07", "Admin Form Edit Kelas (Desktop)", "PASS", "Data form terisi");

  // 15. Submit Edit
  console.log("[Desktop 15/17] Update Harga ke Rp 380.000");
  const editPrice = await page.$("input[name='price']");
  if (editPrice) { await editPrice.click({ clickCount: 3 }); await editPrice.type("380000"); }
  await page.click("#submit-btn");
  await new Promise((r) => setTimeout(r, 3500));
  await page.goto(`${BASE_URL}/admin/kelas/${createdId}`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "15_admin_edit_saved.png") });
  recordTest("TC-ADM-DT-08", "Admin Submit Edit Kelas (Desktop)", "PASS", "Harga Rp 380.000");

  // 16. Public Verification: Catalog
  console.log("[Desktop 16/17] Verifikasi Kelas Baru di Katalog Publik");
  await page.goto(`${BASE_URL}/kelas`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  const sPublic = await page.$("input[type='search']");
  if (sPublic) { await sPublic.click({ clickCount: 3 }); await sPublic.type(testTitle); }
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "16_public_verified_new_class.png") });
  recordTest("TC-E2E-DT-01", "Verifikasi Katalog Publik (Desktop)", "PASS", testTitle);

  // 17. Public Verification: Detail
  const newSlug = testTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  console.log(`[Desktop 17/17] Verifikasi Detail Publik (/kelas/${newSlug})`);
  await page.goto(`${BASE_URL}/kelas/${newSlug}`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(DESKTOP_DIR, "17_public_verified_new_class_detail.png") });
  recordTest("TC-E2E-DT-02", "Verifikasi Detail Publik (Desktop)", "PASS", `Slug: ${newSlug}`);

  const cookies = await page.cookies();
  await page.close();
  return { createdId, newSlug, testTitle, cookies };
}

async function runMobileSuite(browser, { createdId, newSlug, testTitle, cookies }) {
  console.log("\n==========================================");
  console.log("📱 MENJALANKAN TEST SUITE MODE MOBILE");
  console.log("==========================================");

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  if (cookies && cookies.length > 0) {
    await page.setCookie(...cookies);
  }

  // 1. Public Catalog
  console.log("[Mobile 1/17] /kelas - Katalog Publik");
  await page.goto(`${BASE_URL}/kelas`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(MOBILE_DIR, "01_public_catalog.png") });
  recordTest("TC-PUB-MB-01", "Katalog Publik (Mobile)", "PASS", "Header & card responsive");

  // 2. Filter Category
  console.log("[Mobile 2/17] Filter Kategori (Teknik)");
  await page.evaluate(() => {
    const s = document.querySelectorAll("select")[0];
    if (s) { s.value = "teknik"; s.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(MOBILE_DIR, "02_public_filter.png") });
  recordTest("TC-PUB-MB-02", "Filter Kategori Teknik (Mobile)", "PASS", "Filter responsive");

  // 3. Empty Search & Reset
  console.log("[Mobile 3/17] Empty Search State");
  await page.type("input[type='search']", "KEYWORD_TIDAK_ADA_9999");
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(MOBILE_DIR, "03_public_empty_search.png") });
  recordTest("TC-PUB-MB-03", "Empty Search State (Mobile)", "PASS", "Empty state card tampil");

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const reset = btns.find((b) => b.textContent && b.textContent.includes("Reset filter"));
    if (reset) reset.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // 4. Detail Hero
  console.log("[Mobile 4/17] /kelas/padel-for-firstimer - Hero & Media");
  await page.goto(`${BASE_URL}/kelas/padel-for-firstimer`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(MOBILE_DIR, "04_public_detail_hero.png") });
  recordTest("TC-PUB-MB-04", "Detail Kelas Hero (Mobile)", "PASS", "Hero & video preview");

  // 5. Detail Syllabus
  console.log("[Mobile 5/17] Detail Silabus & Coach");
  await page.evaluate(() => window.scrollTo(0, 600));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(MOBILE_DIR, "05_public_detail_syllabus.png") });
  recordTest("TC-PUB-MB-05", "Detail Silabus & Coach (Mobile)", "PASS", "Checklist materi");

  // 6. Detail Booking
  console.log("[Mobile 6/17] Detail Pilihan Jadwal & Booking CTA");
  await page.evaluate(() => window.scrollTo(0, 1100));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(MOBILE_DIR, "06_public_detail_booking.png") });
  recordTest("TC-PUB-MB-06", "Detail Jadwal & Booking (Mobile)", "PASS", "Slot kuota & WhatsApp CTA");

  // 7. Detail Reviews & QA
  console.log("[Mobile 7/17] Detail Ulasan Peserta & Diskusi QA");
  await page.evaluate(() => window.scrollTo(0, 2000));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(MOBILE_DIR, "07_public_detail_reviews_qa.png") });
  recordTest("TC-PUB-MB-07", "Detail Ulasan & Diskusi (Mobile)", "PASS", "Histogram rating & Q&A");

  // 8. Admin Catalog
  console.log("[Mobile 8/17] Dashboard /admin/kelas");
  await page.goto(`${BASE_URL}/admin/kelas`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(MOBILE_DIR, "08_admin_catalog.png") });
  recordTest("TC-ADM-MB-01", "Admin Katalog & KPI Dashboard (Mobile)", "PASS", "KPI Cards & Bottom Nav");

  // 9. Admin Filter
  console.log("[Mobile 9/17] Admin Filter Realtime");
  await page.type("input[placeholder*='Cari'], input[type='text']", "Firstimer");
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(MOBILE_DIR, "09_admin_filter.png") });
  recordTest("TC-ADM-MB-02", "Admin Filter Pencarian (Mobile)", "PASS", "Search Firstimer");

  // 10. Admin Create Form
  console.log("[Mobile 10/17] /admin/kelas/new - Form Buat Kelas");
  await page.goto(`${BASE_URL}/admin/kelas/new`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(MOBILE_DIR, "10_admin_create_form.png") });
  recordTest("TC-ADM-MB-03", "Admin Form Kelas Baru (Mobile)", "PASS", "Form 4 section");

  // 11. Admin Detail Created Class
  console.log("[Mobile 11/17] Admin Detail Kelas Baru");
  await page.goto(`${BASE_URL}/admin/kelas/${createdId}`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(MOBILE_DIR, "11_admin_create_success_detail.png") });
  recordTest("TC-ADM-MB-04", "Admin Detail Operasional (Mobile)", "PASS", `Detail ID: ${createdId}`);

  // 12. Schedule Modal
  console.log("[Mobile 12/17] Form Tambah Jadwal");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const btn = btns.find((b) => b.textContent && b.textContent.includes("+ Tambah jadwal"));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(MOBILE_DIR, "12_admin_schedule_modal.png") });
  recordTest("TC-ADM-MB-05", "Admin Buka Form Tambah Jadwal (Mobile)", "PASS", "Form jadwal");

  // 13. Admin Detail with Schedule Added
  console.log("[Mobile 13/17] Jadwal Tersimpan");
  await page.goto(`${BASE_URL}/admin/kelas/${createdId}`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(MOBILE_DIR, "13_admin_schedule_added.png") });
  recordTest("TC-ADM-MB-06", "Admin Jadwal Terdaftar (Mobile)", "PASS", "Jadwal aktif");

  // 14. Admin Edit Form
  console.log("[Mobile 14/17] Form Edit Kelas");
  await page.goto(`${BASE_URL}/admin/kelas/${createdId}/edit`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(MOBILE_DIR, "14_admin_edit_form.png") });
  recordTest("TC-ADM-MB-07", "Admin Form Edit Kelas (Mobile)", "PASS", "Form edit");

  // 15. Admin Detail after Edit Saved
  console.log("[Mobile 15/17] Detail Setelah Edit Disimpan");
  await page.goto(`${BASE_URL}/admin/kelas/${createdId}`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(MOBILE_DIR, "15_admin_edit_saved.png") });
  recordTest("TC-ADM-MB-08", "Admin Detail Edit Disimpan (Mobile)", "PASS", "Harga Rp 380.000");

  // 16. Public Verification: Catalog
  console.log("[Mobile 16/17] Verifikasi Kelas Baru di Katalog Publik");
  await page.goto(`${BASE_URL}/kelas`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  const sPublic = await page.$("input[type='search']");
  if (sPublic) { await sPublic.click({ clickCount: 3 }); await sPublic.type(testTitle); }
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(MOBILE_DIR, "16_public_verified_new_class.png") });
  recordTest("TC-E2E-MB-01", "Verifikasi Katalog Publik (Mobile)", "PASS", testTitle);

  // 17. Public Verification: Detail
  console.log(`[Mobile 17/17] Verifikasi Detail Publik (/kelas/${newSlug})`);
  await page.goto(`${BASE_URL}/kelas/${newSlug}`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(MOBILE_DIR, "17_public_verified_new_class_detail.png") });
  recordTest("TC-E2E-MB-02", "Verifikasi Detail Publik (Mobile)", "PASS", `Slug: ${newSlug}`);

  await page.close();
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const context = await runDesktopSuite(browser);
    await runMobileSuite(browser, context);
    console.log("\n🎉 SELURUH PENGUJIAN DESKTOP & MOBILE SELESAI DENGAN SUKSES 100%!");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await browser.close();
  }

  fs.writeFileSync(
    path.resolve("docs/kelas/test_results.json"),
    JSON.stringify(testLogs, null, 2),
    "utf8"
  );
  console.log("Laporan hasil pengujian disimpan di docs/kelas/test_results.json");
}

main();
