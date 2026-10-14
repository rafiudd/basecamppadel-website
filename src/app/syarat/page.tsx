import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { SUPPORT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Syarat Layanan — Basecamp Padel",
  description: "Ketentuan memakai situs dan akun pemain Basecamp Padel.",
};

const UPDATED = "13 Oktober 2026";
const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

const SECTIONS: LegalSection[] = [
  {
    title: "Tentang layanan",
    body: (
      <p>
        Basecamp Padel adalah komunitas padel. Situs ini menampilkan jadwal, event, live score, dan leaderboard, serta akun
        pemain untuk menyimpan profil, riwayat event, dan catatan coach. Dengan memakai situs atau masuk ke akun, kamu setuju
        dengan syarat ini dan dengan <Link href="/privasi">Kebijakan Privasi</Link> kami.
      </p>
    ),
  },
  {
    title: "Akun pemain",
    body: (
      <ul>
        <li>Akun dibuat dengan login Google. Satu orang satu akun, dan satu nomor WhatsApp hanya untuk satu akun.</li>
        <li>Isi profil dengan data yang benar, terutama nama, kategori, dan nomor WhatsApp, karena dipakai untuk pembagian kategori dan konfirmasi event.</li>
        <li>Klaim data pemain lama hanya boleh untuk data milikmu sendiri. Klaim diverifikasi admin.</li>
        <li>Kamu bertanggung jawab atas aktivitas di akunmu. Kalau ada yang mencurigakan, kabari kami.</li>
      </ul>
    ),
  },
  {
    title: "Event, hasil, dan leaderboard",
    body: (
      <ul>
        <li>Pendaftaran, biaya, dan kebijakan pembatalan atau refund mengikuti ketentuan di halaman masing-masing event.</li>
        <li>Hasil match, poin, dan peringkat dicatat panitia. Koreksi bisa diajukan ke panitia atau admin.</li>
        <li>Nama panggilan, kategori, kota, foto, poin, dan hasil match kamu tampil publik di jadwal dan leaderboard.</li>
        <li>Nilai dan catatan coach adalah penilaian coach untuk membantu latihan, bukan sertifikasi resmi.</li>
      </ul>
    ),
  },
  {
    title: "Etika",
    body: (
      <ul>
        <li>Jaga sportivitas di lapangan maupun di komunitas.</li>
        <li>Jangan memakai identitas orang lain, mengunggah foto yang tidak pantas, atau mencoba mengakses data dan akun orang lain.</li>
        <li>Admin boleh menyesuaikan, menyembunyikan, atau menonaktifkan profil dan akun yang melanggar ketentuan ini.</li>
      </ul>
    ),
  },
  {
    title: "Foto dan konten",
    body: (
      <p>
        Foto profil yang kamu unggah tetap milikmu. Kamu mengizinkan kami menampilkannya di situs (profil, jadwal,
        leaderboard). Foto dokumentasi event bisa diambil oleh panitia atau media partner untuk publikasi komunitas. Kalau
        keberatan fotomu dipakai, hubungi {mail}.
      </p>
    ),
  },
  {
    title: "Batasan tanggung jawab",
    body: (
      <p>
        Situs disediakan apa adanya untuk mendukung kegiatan komunitas. Kami berusaha menjaga data dan jadwal tetap akurat,
        tapi bisa saja ada keterlambatan atau kesalahan. Keselamatan saat bermain tetap tanggung jawab masing-masing pemain,
        dan aturan venue tetap berlaku.
      </p>
    ),
  },
  {
    title: "Menghapus akun",
    body: (
      <p>
        Kamu bisa menghapus akun kapan saja di Profil → Edit profil → Hapus akun. Detail data yang dihapus dan yang tetap
        tersimpan ada di <Link href="/privasi">Kebijakan Privasi</Link>.
      </p>
    ),
  },
  {
    title: "Perubahan dan kontak",
    body: (
      <p>
        Syarat ini bisa diperbarui sewaktu-waktu, dan tanggal di atas akan ikut berubah. Pertanyaan? Hubungi {mail}.
      </p>
    ),
  },
];

export default function SyaratPage() {
  return (
    <LegalPage
      eyebrow="Basecamp Padel"
      title="Syarat Layanan"
      updated={UPDATED}
      intro={<p>Ketentuan memakai situs www.basecamppadel.id dan akun pemain Basecamp Padel.</p>}
      sections={SECTIONS}
    />
  );
}
