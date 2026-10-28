import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { SUPPORT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — Basecamp Padel",
  description: "Data apa yang dikumpulkan Basecamp Padel, untuk apa, siapa yang bisa melihatnya, dan cara menghapusnya.",
};

const UPDATED = "28 Oktober 2026";
const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

const SECTIONS: LegalSection[] = [
  {
    title: "Data dari akun Google kamu",
    body: (
      <>
        <p>Kamu masuk ke Basecamp Padel pakai akun Google (Google Sign-In). Saat login, kami hanya menerima:</p>
        <ul>
          <li><b>Nama</b> akun Google kamu,</li>
          <li><b>Alamat email</b>,</li>
          <li><b>Foto profil</b> Google.</li>
        </ul>
        <p>
          Kami <b>tidak</b> mengakses kontak, Gmail, Drive, kalender, atau data Google lainnya, dan kami tidak pernah menerima
          password Google kamu. Nama dan foto dipakai sebagai isian awal profil (bisa kamu ubah), email dipakai sebagai
          identitas login dan untuk menghubungimu soal akun.
        </p>
      </>
    ),
  },
  {
    title: "Data profil yang kamu isi",
    body: (
      <>
        <p>Saat melengkapi atau mengedit profil, kamu mengisi:</p>
        <ul>
          <li>Nama lengkap dan nama panggilan, kategori (Women/Men), kota, dan foto profil;</li>
          <li>Nomor WhatsApp (wajib) dan username Instagram (opsional);</li>
          <li>Info main padel: lama bermain, tangan dominan, posisi favorit, dan perkiraan level.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Data permainan dan coaching",
    body: (
      <ul>
        <li>Event dan sesi yang kamu ikuti, hasil match, skor, poin, dan peringkat leaderboard;</li>
        <li>Nilai teknik dan in-game, catatan evaluasi, dan saran latihan dari coach di sesi Mabar with Coach (rapor).</li>
      </ul>
    ),
  },
  {
    title: "Untuk apa datanya dipakai",
    body: (
      <ul>
        <li>Membuat dan mengamankan akun kamu, serta menyambungkannya ke data pemain lama kalau nomor WA atau nama cocok;</li>
        <li>Menampilkan profil, statistik, catatan coach, rapor, dan riwayat event di halaman akunmu;</li>
        <li>Menyusun jadwal, grup, match, dan leaderboard komunitas;</li>
        <li>Menghubungi kamu lewat WhatsApp atau email soal jadwal, konfirmasi event, dan akun.</li>
      </ul>
    ),
  },
  {
    title: "Siapa yang bisa melihat datamu",
    body: (
      <>
        <ul>
          <li>
            <b>Publik (siapa saja):</b> nama panggilan, kategori, kota, foto, poin, dan hasil match yang tampil di jadwal dan
            leaderboard.
          </li>
          <li>
            <b>Hanya kamu:</b> nilai dan catatan coach, rapor, nomor WhatsApp, email, dan isian profil lainnya di halaman akun.
          </li>
          <li>
            <b>Admin dan coach Basecamp Padel:</b> data profil dan permainan yang dibutuhkan untuk mengelola event dan memberi
            penilaian.
          </li>
        </ul>
        <p>
          Kami <b>tidak menjual</b> data kamu dan tidak membagikannya ke pengiklan. Data hanya diproses oleh penyedia layanan
          yang kami pakai untuk menjalankan situs: Supabase (database, login, dan penyimpanan foto) dan Google (login, serta
          Google Analytics untuk statistik kunjungan).
        </p>
      </>
    ),
  },
  {
    title: "Penyimpanan dan keamanan",
    body: (
      <ul>
        <li>Data disimpan di database Supabase dengan akses dibatasi per akun (row level security).</li>
        <li>Login memakai cookie sesi yang berlaku 30 hari sejak kunjungan terakhir.</li>
        <li>
          Kami memakai Google Analytics untuk statistik kunjungan anonim (halaman yang dibuka, perangkat, perkiraan lokasi
          setingkat kota). Google Analytics memasang cookie <code>_ga</code>. Data ini tidak dihubungkan ke akun atau
          profilmu, dan tidak dipakai untuk iklan. Kamu bisa menolaknya lewat pengaturan cookie browser atau{" "}
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">
            add-on opt-out Google Analytics
          </a>
          .
        </li>
        <li>Semua koneksi ke situs memakai HTTPS.</li>
      </ul>
    ),
  },
  {
    title: "Menghapus akun dan data",
    body: (
      <>
        <p>
          Kamu bisa menghapus akun kapan saja di <b>Profil → Edit profil → Hapus akun</b>. Login dan profil kamu (termasuk
          email, nomor WhatsApp, Instagram, dan foto profil) akan dihapus permanen.
        </p>
        <p>
          Hasil pertandingan dan poin yang sudah tercatat tetap ada di leaderboard karena menjadi bagian dari hasil event
          bersama. Kalau kamu ingin data itu juga dihapus atau disamarkan, kirim email ke {mail}.
        </p>
      </>
    ),
  },
  {
    title: "Hak kamu",
    body: (
      <p>
        Kamu bisa melihat dan mengubah data profil sendiri di halaman akun, menarik akses Basecamp Padel dari akun Google di{" "}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">
          myaccount.google.com/permissions
        </a>
        , serta meminta salinan, koreksi, atau penghapusan data lewat {mail}.
      </p>
    ),
  },
  {
    title: "Perubahan dan kontak",
    body: (
      <p>
        Kalau kebijakan ini berubah, tanggal di atas akan diperbarui. Pertanyaan soal privasi? Hubungi kami di {mail}. Lihat
        juga <Link href="/syarat">Syarat Layanan</Link>.
      </p>
    ),
  },
];

export default function PrivasiPage() {
  return (
    <LegalPage
      eyebrow="Basecamp Padel"
      title="Kebijakan Privasi"
      updated={UPDATED}
      intro={
        <p>
          Kebijakan ini menjelaskan data apa yang dikumpulkan situs Basecamp Padel (www.basecamppadel.id) saat kamu memakai
          akun pemain, untuk apa data itu dipakai, siapa yang bisa melihatnya, dan cara menghapusnya.
        </p>
      }
      sections={SECTIONS}
    >
      <section lang="en" className="border-t border-ink/10 pt-8">
        <h2 className="font-display font-bold text-xl text-indigo m-0">English summary</h2>
        <div className="text-ink/85">
          <p>
            Basecamp Padel uses Google Sign-In only to identify players. From your Google account we receive your{" "}
            <b>name, email address, and profile picture</b>, nothing else (no contacts, Gmail, Drive, or calendar). They are
            used to create your player account and prefill your profile; the email is your login identity and our way to
            contact you about your account.
          </p>
          <p>
            You also provide a nickname, category, city, WhatsApp number, optional Instagram handle, and playing details. We
            store match results, points, and coach assessments. Your nickname, category, city, photo, points, and match results
            are public on the schedule and leaderboard; coach notes, reports, WhatsApp, and email are visible only to you and to
            Basecamp Padel admins/coaches.
          </p>
          <p>
            We do not sell or share your data with advertisers. Data is processed by Supabase (database, authentication,
            storage) and Google (sign-in, and Google Analytics for anonymous visit statistics via the <code>_ga</code> cookie,
            not linked to your account or used for ads). You can delete your account at any time from Edit profile → Delete account, which
            permanently removes your login and profile; recorded match results stay on the leaderboard unless you ask us to
            remove them. Contact: {mail}.
          </p>
        </div>
      </section>
    </LegalPage>
  );
}
