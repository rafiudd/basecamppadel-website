import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: /localhost|127\.0\.0\.1/.test(process.env.SUPABASE_DB_URL) ? false : { rejectUnauthorized: false },
});

const CLASSES_DATA = [
  {
    slug: "padel-for-firstimer",
    title: "Padel for Firstimer",
    desc: "Baru pertama pegang raket? Kenalan sama grip, servis, aturan main, dan langsung main 1 game.",
    suitablePins: ["Putih"],
    category: "dasar",
    sessions: 1,
    duration: 90,
    capacity: 4,
    price: 150000,
    coachName: "Reyhan",
    hasVideo: true,
    isNew: false,
    sortOrder: 0,
    learningPoints: [
      "Kenalan sama grip kontinental & posisi siap",
      "Aturan dasar servis underhand & pantulan kaca",
      "Pukulan forehand & backhand santai",
      "Simulasi game 1 set mini bareng coach"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Pengenalan & Game Mini", desc: "Adaptasi raket, rasa pantulan bola di kaca, dan langsung coba main mini game 1 set." }
    ],
    schedules: [
      { datesLabel: "Sab, 31 Okt", timeRange: "07.00–08.30", status: "active" },
      { datesLabel: "Sab, 7 Nov", timeRange: "07.00–08.30", status: "active" }
    ]
  },
  {
    slug: "aturan-dan-skor-padel",
    title: "Aturan & Skor Padel",
    desc: "Paham hitungan skor, aturan servis, bola kena kaca, dan etika di court. Cocok sebelum ikut mabar.",
    suitablePins: ["Putih"],
    category: "dasar",
    sessions: 1,
    duration: 60,
    capacity: 6,
    price: 100000,
    coachName: "Reyhan",
    hasVideo: false,
    isNew: false,
    sortOrder: 1,
    learningPoints: [
      "Sistem skor padel, deuce, golden point, dan tiebreak",
      "Kapan bola out dan kapan boleh diambil setelah kaca",
      "Etika & posisi servis silang",
      "Komunikasi dan etika partner di court"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Teori & Simulasi Game", desc: "Praktek langsung hitung skor di court dalam format simulasi pertandingan." }
    ]
  },
  {
    slug: "grip-dan-footwork-dasar",
    title: "Grip & Footwork Dasar",
    desc: "Cara pegang raket yang benar, posisi siap, split-step, dan langkah ke bola.",
    suitablePins: ["Putih"],
    category: "dasar",
    sessions: 1,
    duration: 90,
    capacity: 4,
    price: 150000,
    coachName: "Adit",
    hasVideo: false,
    isNew: false,
    sortOrder: 2,
    learningPoints: [
      "Grip continental yang nyaman tanpa pergelangan kaku",
      "Split step tepat saat lawan memukul",
      "Gerakan kaki maju mundur dan lateral",
      "Keseimbangan tubuh saat eksekusi pukulan"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Drill Footwork", desc: "Latihan kelincahan langkah, split step, dan pemulihan posisi tengah." }
    ]
  },
  {
    slug: "padel-for-newbie",
    title: "Padel for Newbie",
    desc: "Bangun pukulan dasar yang stabil: forehand, backhand, volley, dan posisi di court.",
    suitablePins: ["Putih", "Kuning"],
    category: "dasar",
    sessions: 4,
    duration: 90,
    capacity: 4,
    price: 500000,
    coachName: "Lukman",
    hasVideo: true,
    isNew: false,
    sortOrder: 3,
    learningPoints: [
      "Forehand & backhand konsisten dengan ayunan pendek",
      "Block volley di area net tanpa swing berlebih",
      "Transisi maju ke net setelah lob",
      "Dasar pengembalian bola kaca belakang"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Groundstroke Konsisten", desc: "Konsistensi forehand dan backhand lurus dan silang." },
      { session: 2, title: "Net Volley Dasar", desc: "Menjaga net dengan volley block terkontrol." },
      { session: 3, title: "Kaca Belakang Awal", desc: "Membiarkan bola memantul dan mengambil setelah kaca." },
      { session: 4, title: "Simulasi Game", desc: "Praktek strategi 4 sesi dalam pertandingan didampingi evaluasi." }
    ],
    schedules: [
      { datesLabel: "Sen, 2 Nov", timeRange: "19.00–20.30", status: "active" }
    ]
  },
  {
    slug: "forehand-dan-backhand-konsisten",
    title: "Forehand & Backhand Konsisten",
    desc: "Rally lebih panjang tanpa nyangkut net: ayunan, titik kena bola, dan arah pukulan.",
    suitablePins: ["Putih", "Kuning"],
    category: "teknik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 300000,
    coachName: "Lukman",
    hasVideo: false,
    isNew: false,
    sortOrder: 4,
    learningPoints: [
      "Kontrol kedalaman pukulan ke baseline lawan",
      "Titik sentuh bola di depan badan",
      "Mengurangi unforced error di net",
      "Variasi crosscourt dan down-the-line"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Drill Ayunan Pendek", desc: "Repetisi pukulan flat dan sedikit slice dengan kontrol arah." },
      { session: 2, title: "Rally Berkelanjutan", desc: "Target rally 20 pukulan berturut-turut tanpa mati." }
    ]
  },
  {
    slug: "servis-dan-return",
    title: "Servis & Return",
    desc: "Servis yang susah diserang dan return yang bikin tim kamu langsung pegang inisiatif.",
    suitablePins: ["Kuning"],
    category: "teknik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 300000,
    coachName: "Reyhan",
    hasVideo: false,
    isNew: false,
    sortOrder: 5,
    learningPoints: [
      "Servis slice ke arah kaca samping lawan",
      "Servis ke arah T tengah",
      "Return lob untuk merebut net",
      "Return agresif ke kaki server yang maju"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Teknik Servis Slice", desc: "Putaran bola rendah dan membidik kaca samping." },
      { session: 2, title: "Pola Return & Net Takeover", desc: "Kombinasi return lob dan maju cepat ke net." }
    ]
  },
  {
    slug: "volley-dan-net-game",
    title: "Volley & Net Game",
    desc: "Kuasai area net: volley blok, volley dalam, dan kapan maju bareng partner.",
    suitablePins: ["Kuning", "Biru"],
    category: "teknik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 300000,
    coachName: "Lukman",
    hasVideo: false,
    isNew: false,
    sortOrder: 6,
    learningPoints: [
      "Volley agresif dengan slice untuk bola rendah",
      "Block volley saat menerima passing shot kencang",
      "Sinkronisasi posisi net bersama partner",
      "Membidik celah tengah antar lawan"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Volley Kontrol", desc: "Mengarahkan bola ke sudut court dan kaki lawan." },
      { session: 2, title: "Net Domination", desc: "Menutup sudut passing shot dan counter smash." }
    ],
    schedules: [
      { datesLabel: "Rab, 4 Nov", timeRange: "19.00–20.30", status: "active" }
    ]
  },
  {
    slug: "lob-dan-chiquita",
    title: "Lob & Chiquita",
    desc: "Dua senjata buat ngusir lawan dari net: lob tinggi yang dalam dan bola pelan ke kaki.",
    suitablePins: ["Kuning", "Biru"],
    category: "teknik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 300000,
    coachName: "Reyhan",
    hasVideo: false,
    isNew: false,
    sortOrder: 7,
    learningPoints: [
      "Lob defensif tinggi untuk reset posisi",
      "Lob ofensif cepat melompati lawan",
      "Chiquita pelan ke kaki lawan di net",
      "Kapan transisi dari defense ke offense"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Presisi Lob", desc: "Latihan melambungkan bola ke meter terakhir court lawan." },
      { session: 2, title: "Chiquita & Follow-up", desc: "Pukulan chiquita dilanjutkan maju merebut net." }
    ]
  },
  {
    slug: "mastering-backglass",
    title: "Mastering Backglass",
    desc: "Berhenti panik waktu bola mantul di kaca belakang. Baca pantulan, atur jarak, balikin dengan aman.",
    suitablePins: ["Kuning", "Biru"],
    category: "teknik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 300000,
    coachName: "Lukman",
    hasVideo: true,
    isNew: false,
    sortOrder: 8,
    learningPoints: [
      "Baca arah & tinggi pantulan dari kaca belakang",
      "Atur jarak: mundur dulu, baru maju ke bola",
      "Pukulan balik aman: lob tinggi & bola rendah ke kaki lawan",
      "Kapan biarin bola ke kaca vs volley duluan"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Baca pantulan", desc: "Drill feed bola ke kaca, latihan posisi badan & jarak. Diakhiri game kecil." },
      { session: 2, title: "Balik nyerang", desc: "Dari kaca langsung lob / chiquita, lalu naik ke net bareng partner. Diakhiri match 1 set pendek." }
    ],
    requirements: [
      "Raket sendiri (bisa pinjam, bilang pas daftar)",
      "Sepatu olahraga, bukan sepatu lari tebal",
      "Datang 10 menit sebelum mulai"
    ],
    schedules: [
      { datesLabel: "Sab, 31 Okt & 7 Nov", timeRange: "09.00–10.30", status: "active" },
      { datesLabel: "Sel, 3 & 10 Nov", timeRange: "19.00–20.30", status: "active" },
      { datesLabel: "Sab, 14 & 21 Nov", timeRange: "09.00–10.30", status: "active" }
    ],
    reviews: [
      { author: "Sari", rating: 5, date: "2026-10-12T08:00:00.000Z", content: "Akhirnya ngerti kenapa selalu telat di kaca belakang. Drill-nya repetitif tapi kerasa banget hasilnya di mabar minggu depannya." },
      { author: "Rendi", rating: 5, date: "2026-09-28T08:00:00.000Z", content: "Coach Lukman sabar, tiap orang dikoreksi satu-satu. 4 orang per coach pas banget." },
      { author: "Tasya", rating: 4, date: "2026-09-14T08:00:00.000Z", content: "Materinya mantap. Sesi 2 agak cepat buat aku, tapi dapat rekaman video buat latihan sendiri." }
    ],
    comments: [
      { author: "Dimas", comment: "Jadwal Selasa malam masih bisa buat 2 orang? Aku sama partner.", reply: null },
      { author: "Andra", comment: "Kalau belum punya raket bisa pinjam?", reply: "Bisa, bilang aja pas daftar. Kami siapin raket pinjaman gratis." },
      { author: "Fikri", comment: "Pin Putih boleh ikut kelas ini?", reply: "Boleh, tapi lebih enak ambil Padel for Newbie dulu biar pukulan dasarnya udah stabil." }
    ]
  },
  {
    slug: "side-wall-dan-bajada",
    title: "Side Wall & Bajada",
    desc: "Bola dari kaca samping dan cara balikin bola tinggi pakai bajada.",
    suitablePins: ["Biru"],
    category: "teknik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 300000,
    coachName: "Adit",
    hasVideo: false,
    isNew: false,
    sortOrder: 9,
    learningPoints: [
      "Membaca sudut pantulan dinding samping",
      "Bajada forehand bertenaga dari bola tinggi",
      "Bajada backhand slice terarah",
      "Kombinasi dinding samping dan rotasi badan"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Side Wall Angles", desc: "Analisa sudut datang dan pantul bola kaca samping." },
      { session: 2, title: "Bajada Attack", desc: "Pukulan agresif turun dari pantulan tinggi kaca belakang." }
    ]
  },
  {
    slug: "mastering-double-glass",
    title: "Mastering Double Glass",
    desc: "Bola kena 2 kaca (belakang + samping). Latihan baca sudut dan timing biar tetap bisa nyerang balik.",
    suitablePins: ["Biru", "Merah"],
    category: "teknik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 300000,
    coachName: "Adit",
    hasVideo: false,
    isNew: false,
    sortOrder: 10,
    learningPoints: [
      "Mendeteksi urutan kaca (belakang-samping vs samping-belakang)",
      "Gerakan rotasi berputar searah bola",
      "Timing ayunan saat bola keluar dari sudut",
      "Counter lob dari situasi double glass sulit"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Teori Sudut & Putaran", desc: "Membiasakan mata dan footwork mengikuti putaran bola di sudut kaca." },
      { session: 2, title: "Serangan Balik Sudut", desc: "Mengubah bola sulit di sudut menjadi lob balik penyerang." }
    ],
    schedules: [
      { datesLabel: "Kam, 5 Nov", timeRange: "19.00–20.30", status: "active" }
    ]
  },
  {
    slug: "bandeja-dan-vibora",
    title: "Bandeja & Víbora",
    desc: "Pukulan overhead khas padel buat jaga posisi di net tanpa kehilangan poin.",
    suitablePins: ["Merah", "Hitam"],
    category: "teknik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 350000,
    coachName: "Adit",
    hasVideo: true,
    isNew: false,
    sortOrder: 11,
    learningPoints: [
      "Posisi persiapan bandeja dengan siku tinggi",
      "Slice flat bandeja agar bola tetap rendah setelah memantul di kaca",
      "Sidespin agresif víbora meliuk di sudut",
      "Memulihkan posisi net segera setelah overhead"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Bandeja Pengontrol", desc: "Memukul bola overhead mundur dan menjaga dominasi net." },
      { session: 2, title: "Víbora Berbahaya", desc: "Pukulan sidespin tajam mengarah ke kaca samping lawan." }
    ]
  },
  {
    slug: "smash-x3-x4-dan-rulo",
    title: "Smash x3 / x4 & Rulo",
    desc: "Smash yang mantul keluar court dan smash topspin buat nutup poin.",
    suitablePins: ["Hitam"],
    category: "teknik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 400000,
    coachName: "Adit",
    hasVideo: false,
    isNew: true,
    sortOrder: 12,
    learningPoints: [
      "Topspin smash Por Tres (keluar tembok 3 meter)",
      "Smash power Por Cuatro (keluar pagar 4 meter)",
      "Rulo ke arah pagar kawat lawan",
      "Pilihan smash berdasarkan posisi bola dan angin"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Rulo ke Pagar", desc: "Topspin overhead lambat ke arah grid pagar." },
      { session: 2, title: "Por 3 & Por 4", desc: "Latihan arch punggung dan titik temu tinggi smash penuntas poin." }
    ]
  },
  {
    slug: "contrapared-dan-pukulan-kreatif",
    title: "Contrapared & Pukulan Kreatif",
    desc: "Pukulan ke kaca sendiri, gancho, dan variasi buat keluar dari situasi sulit.",
    suitablePins: ["Hitam"],
    category: "teknik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 400000,
    coachName: "Lukman",
    hasVideo: false,
    isNew: true,
    sortOrder: 13,
    learningPoints: [
      "Contrapared tinggi saat bola sudah melewati badan",
      "Gancho lambat menyilang",
      "Pukulan tipuan dan drop shot di net",
      "Manajemen risiko saat situasi terjepit"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Contrapared", desc: "Memukul bola ke kaca belakang sendiri melambung ke court lawan." },
      { session: 2, title: "Trik & Pukulan Kreatif", desc: "Variasi pukulan sudut dan gancho." }
    ]
  },
  {
    slug: "mastering-right-side",
    title: "Mastering Right Side",
    desc: "Peran pemain kanan (drive): konsistensi, return servis, dan bikin peluang buat partner.",
    suitablePins: ["Biru"],
    category: "taktik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 300000,
    coachName: "Reyhan",
    hasVideo: false,
    isNew: false,
    sortOrder: 14,
    learningPoints: [
      "Fokus peran drive: sabar, konsisten, dan akurat",
      "Return servis ke kaca samping server lawan",
      "Membuka celah bagi partner penyerang di kiri",
      "Lob diagonal panjang yang aman"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Peran Pemain Kanan", desc: "Membangun pertahanan solid dan return servis konsisten." },
      { session: 2, title: "Sinergi Sisi Kanan", desc: "Menyiapkan bola empuk untuk diselesaikan partner di sisi kiri." }
    ]
  },
  {
    slug: "mastering-left-side",
    title: "Mastering Left Side",
    desc: "Peran pemain kiri (revés): smash, bandeja, dan ambil bola tengah sebagai penyerang.",
    suitablePins: ["Biru", "Merah"],
    category: "taktik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 300000,
    coachName: "Adit",
    hasVideo: true,
    isNew: false,
    sortOrder: 15,
    learningPoints: [
      "Peran penyerang utama tim",
      "Mengambil bola lambung di area tengah court",
      "Variasi smash penentu dan víbora sudut",
      "Disiplin saat partner bertahan di baseline"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Coverage Bola Tengah", desc: "Hierarki bola tengah untuk pemain kiri." },
      { session: 2, title: "Eksekusi Serangan", desc: "Kombinasi bandeja dalam dan smash mematikan." }
    ],
    schedules: [
      { datesLabel: "Sab, 7 Nov", timeRange: "09.00–10.30", status: "active" }
    ]
  },
  {
    slug: "taktik-doubles",
    title: "Taktik Doubles",
    desc: "Positioning, transisi nyerang ↔ bertahan, dan kapan harus naik ke net.",
    suitablePins: ["Kuning", "Biru"],
    category: "taktik",
    sessions: 2,
    duration: 90,
    capacity: 4,
    price: 300000,
    coachName: "Reyhan",
    hasVideo: false,
    isNew: false,
    sortOrder: 16,
    learningPoints: [
      "Prinsip 'terikat tali' antar partner di court",
      "Kapan kedua pemain harus mundur atau maju bersamaan",
      "Mengisolasi lawan yang lebih lemah",
      "Strategi menghadapi pasangan lawan menyerang"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Formasi Dasar Doubles", desc: "Transisi menyerang dan bertahan selaras." },
      { session: 2, title: "Game Plan & Eksekusi", desc: "Analisa kelemahan lawan dan penerapan pola kemenangan." }
    ]
  },
  {
    slug: "main-kompak-bareng-partner",
    title: "Main Kompak bareng Partner",
    desc: "Daftar berdua. Latihan komunikasi, gerak bareng, dan pembagian bola tengah.",
    suitablePins: ["Kuning", "Biru", "Merah"],
    category: "taktik",
    sessions: 1,
    duration: 90,
    capacity: 4,
    price: 400000,
    coachName: "Lukman",
    hasVideo: false,
    isNew: true,
    sortOrder: 17,
    learningPoints: [
      "Daftar berpasangan tetap",
      "Komunikasi vokal singkat dan jelas",
      "Pembagian area tanggung jawab bola tengah",
      "Menjaga moral positif saat tertinggal poin"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Drill Sinergi Pasangan", desc: "Latihan skenario match khusus 2 pasangan tetap." }
    ]
  },
  {
    slug: "match-play-clinic",
    title: "Match Play Clinic",
    desc: "Main match beneran, coach dampingi dan kasih evaluasi tiap game.",
    suitablePins: ["Biru", "Merah", "Hitam"],
    category: "taktik",
    sessions: 1,
    duration: 120,
    capacity: 8,
    price: 200000,
    coachName: "Lukman",
    hasVideo: true,
    isNew: false,
    sortOrder: 18,
    learningPoints: [
      "Pertandingan 1 set penuh dengan evaluasi langsung",
      "Koreksi keputusan taktis real-time dari coach",
      "Simulasi situasi deuce dan poin krusial",
      "Feedback menyeluruh di akhir sesi"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Matchplay Dampingan", desc: "Main rotasi 2 court dengan evaluasi berkala coach tiap 2 game." }
    ],
    schedules: [
      { datesLabel: "Min, 1 Nov", timeRange: "16.00–18.00", status: "active" }
    ]
  },
  {
    slug: "persiapan-turnamen",
    title: "Persiapan Turnamen",
    desc: "Strategi lawan, game plan, dan simulasi poin penting sebelum ikut kompetisi.",
    suitablePins: ["Merah", "Hitam"],
    category: "taktik",
    sessions: 3,
    duration: 90,
    capacity: 4,
    price: 500000,
    coachName: "Adit",
    hasVideo: false,
    isNew: true,
    sortOrder: 19,
    learningPoints: [
      "Manajemen energi dalam turnamen padat",
      "Scouting tipe permainan lawan di pemanasan",
      "Mengamankan service game penting",
      "Menghadapi tekanan suporter dan wasit"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Analisa Game Plan", desc: "Merancang strategi A dan strategi cadangan B." },
      { session: 2, title: "Poin Kritis & Tiebreak", desc: "Simulasi situasi skor 5-5 dan golden point." },
      { session: 3, title: "Mock Tournament", desc: "Simulasi format turnamen beruntun." }
    ]
  },
  {
    slug: "mental-di-poin-penting",
    title: "Mental di Poin Penting",
    desc: "Tetap tenang waktu deuce, bangkit saat ketinggalan, dan rutinitas antar poin.",
    suitablePins: ["Biru", "Merah", "Hitam"],
    category: "mf",
    sessions: 1,
    duration: 90,
    capacity: 6,
    price: 200000,
    coachName: "Reyhan",
    hasVideo: false,
    isNew: false,
    sortOrder: 20,
    learningPoints: [
      "Rutinitas 15 detik sebelum servis / return",
      "Pengendalian nafas saat detak jantung tinggi",
      "Mengabaikan unforced error sebelumnya",
      "Body language positif yang mempengaruhi partner"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Drill Tekanan Mental", desc: "Matchplay dengan handicap poin dan skenario comeback." }
    ]
  },
  {
    slug: "padel-conditioning",
    title: "Padel Conditioning",
    desc: "Latihan fisik khusus padel: footwork, kelincahan, dan stamina buat main 2 jam.",
    suitablePins: ["Putih", "Kuning", "Biru", "Merah", "Hitam"],
    category: "mf",
    sessions: 4,
    duration: 60,
    capacity: 8,
    price: 400000,
    coachName: "Adit",
    hasVideo: false,
    isNew: false,
    sortOrder: 21,
    learningPoints: [
      "Kelincahan tangga ketangkasan (agility ladder)",
      "Kekuatan rotasi core tubuh untuk smash bertenaga",
      "Stamina interval anaerobik khas reli padel",
      "Kecepatan reaksi bola cepat di net"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Agility & Footwork", desc: "Latihan langkah cepat dan perubahan arah mendadak." },
      { session: 2, title: "Core & Rotational Power", desc: "Penguatan otot perut dan punggung bawah." },
      { session: 3, title: "Cardio Interval", desc: "Simulasi reli panjang intensitas tinggi." },
      { session: 4, title: "Endurance Test", desc: "Latihan ketahanan fisik selama 60 menit non-stop." }
    ]
  },
  {
    slug: "pemanasan-dan-cegah-cedera",
    title: "Pemanasan & Cegah Cedera",
    desc: "Rutinitas pemanasan dan pendinginan biar bahu, siku, dan lutut aman.",
    suitablePins: ["Putih", "Kuning", "Biru", "Merah", "Hitam"],
    category: "mf",
    sessions: 1,
    duration: 60,
    capacity: 10,
    price: 100000,
    coachName: "Lukman",
    hasVideo: false,
    isNew: false,
    sortOrder: 22,
    learningPoints: [
      "Pemanasan dinamis bahu (rotator cuff)",
      "Pencegahan tennis/padel elbow",
      "Mobilitas pergelangan kaki dan lutut",
      "Peregangan statis pendinginan setelah mabar"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Workshop Cedera & Pemanasan", desc: "Praktek langsung rutinitas 10 menit sebelum main dan 10 menit setelah main." }
    ]
  },
  {
    slug: "private-1-on-1",
    title: "Private 1-on-1",
    desc: "Satu coach khusus buat kamu. Materi bebas sesuai kebutuhan.",
    suitablePins: ["Putih", "Kuning", "Biru", "Merah", "Hitam"],
    category: "khusus",
    sessions: 1,
    duration: 60,
    capacity: 1,
    price: 350000,
    coachName: null,
    hasVideo: false,
    isNew: false,
    sortOrder: 23,
    learningPoints: [
      "Perhatian 100% dari coach pilihanmu",
      "Materi disesuaikan kelemahan spesifikmu",
      "Video playback koreksi pukulan",
      "Rekomendasi program latihan mandiri"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Sesi Privat Kustom", desc: "Materi fleksibel sesuai permintaan pemain." }
    ]
  },
  {
    slug: "semi-private-berdua",
    title: "Semi-private Berdua",
    desc: "Berdua bareng teman, materi disesuaikan level kalian.",
    suitablePins: ["Putih", "Kuning", "Biru", "Merah", "Hitam"],
    category: "khusus",
    sessions: 1,
    duration: 60,
    capacity: 2,
    price: 250000,
    coachName: null,
    hasVideo: false,
    isNew: false,
    sortOrder: 24,
    learningPoints: [
      "Latihan berdua bareng teman / pasangan",
      "Fokus drill intensif tanpa antre",
      "Penyelarasan level dan komunikasi",
      "Hemat biaya dengan benefit privat"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Sesi Semi-Private", desc: "Latihan intensif 2 orang bersama 1 coach." }
    ]
  },
  {
    slug: "ladies-clinic",
    title: "Ladies Clinic",
    desc: "Kelas khusus perempuan, suasana santai, dari dasar sampai main match.",
    suitablePins: ["Putih", "Kuning", "Biru"],
    category: "khusus",
    sessions: 4,
    duration: 90,
    capacity: 6,
    price: 450000,
    coachName: "Reyhan",
    hasVideo: false,
    isNew: false,
    sortOrder: 25,
    learningPoints: [
      "Suasana belajar santai dan suportif",
      "Penguasaan teknik dasar tanpa tekanan",
      "Latihan reli dan mini match seru",
      "Membangun komunitas padel putri"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Grip & Pukulan Santai", desc: "Adaptasi raket dan pengenalan padel." },
      { session: 2, title: "Net Volley & Kaca", desc: "Praktek bola di net dan pantulan kaca." },
      { session: 3, title: "Komunikasi Court", desc: "Bermain berpasangan dengan kompak." },
      { session: 4, title: "Mini Tournament", desc: "Fun match antar peserta ladies." }
    ],
    schedules: [
      { datesLabel: "Sab, 7 Nov", timeRange: "07.00–08.30", status: "active" }
    ]
  },
  {
    slug: "padel-kids-7-14-th",
    title: "Padel Kids (7–14 th)",
    desc: "Kenalan padel lewat game seru: koordinasi, pukulan dasar, dan sportivitas.",
    suitablePins: ["Putih", "Kuning"],
    category: "khusus",
    sessions: 4,
    duration: 60,
    capacity: 6,
    price: 400000,
    coachName: "Lukman",
    hasVideo: true,
    isNew: false,
    sortOrder: 26,
    learningPoints: [
      "Koordinasi mata-tangan dan motorik anak",
      "Memukul bola dengan raket padel junior",
      "Permainan kelompok menyenangkan dan edukatif",
      "Menanamkan sportivitas sejak dini"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Fun Coordination Games", desc: "Game tangkap dan pukul bola bertarget." },
      { session: 2, title: "Dasar Forehand & Backhand", desc: "Pukulan dasar dengan bola khusus junior." },
      { session: 3, title: "Game Kaca Seru", desc: "Mengenal pantulan kaca dengan cara menyenangkan." },
      { session: 4, title: "Kids Champion Match", desc: "Mini game dan pemberian medali partisipasi." }
    ]
  },
  {
    slug: "weekend-bootcamp",
    title: "Weekend Bootcamp",
    desc: "2 hari intensif: teknik pagi, match sore. Cocok buat naik pin lebih cepat.",
    suitablePins: ["Kuning", "Biru", "Merah"],
    category: "khusus",
    sessions: 2,
    duration: 180,
    capacity: 8,
    price: 750000,
    coachName: "Adit",
    hasVideo: true,
    isNew: true,
    sortOrder: 27,
    learningPoints: [
      "Program akselerasi 2 hari penuh",
      "Pagi drill teknik mendalam, sore matchplay kompetitif",
      "Konsultasi pin level langsung dengan para coach",
      "Video review performa tiap sesi"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Hari 1: Defense & Groundstroke", desc: "3 jam intensif teknik kaca dan konsistensi." },
      { session: 2, title: "Hari 2: Attack & Match Tournament", desc: "3 jam intensif overhead, volley, dan turnamen bootcamp." }
    ]
  },
  {
    slug: "corporate-dan-komunitas",
    title: "Corporate & Komunitas",
    desc: "Kelas privat buat kantor atau komunitas, bisa sekalian mini turnamen.",
    suitablePins: ["Putih", "Kuning", "Biru", "Merah", "Hitam"],
    category: "khusus",
    sessions: 1,
    duration: 120,
    capacity: 16,
    price: 1500000,
    coachName: null,
    hasVideo: false,
    isNew: true,
    sortOrder: 28,
    learningPoints: [
      "Kapasitas grup hingga 16 orang",
      "Pilihan 2-4 coach sekaligus",
      "Format kustom: coaching clinic + mini tournament",
      "Termasuk raket pinjaman dan dokumentasi"
    ],
    sessionsBreakdown: [
      { session: 1, title: "Sesi Corporate Kustom", desc: "Clinic dan turnamen seru sesuai kebutuhan perusahaan / komunitas." }
    ]
  }
];

async function seedClasses() {
  await client.connect();
  console.log("Seeding classes data...");

  // Get coach ids
  const coachRes = await client.query("select id, name from public.coaches");
  const coachMap = {};
  for (const c of coachRes.rows) {
    coachMap[c.name] = c.id;
  }

  // Get first venue if available
  const venueRes = await client.query("select id from public.venues limit 1");
  const defaultVenueId = venueRes.rows[0]?.id || null;

  for (const c of CLASSES_DATA) {
    const coachId = c.coachName ? (coachMap[c.coachName] || null) : null;
    const defaultPhotos = [
      "/images/classes/coach-drill.jpg",
      "/images/classes/backglass-shot.jpg",
      "/images/classes/volley-drill.jpg",
      "/images/cover.jpg",
      "/images/hero.jpg",
      "/images/community.webp",
    ];
    const photoIdx = c.sortOrder || 0;
    const coverUrl = defaultPhotos[photoIdx % defaultPhotos.length];
    const galleryUrls = [
      defaultPhotos[photoIdx % defaultPhotos.length],
      defaultPhotos[(photoIdx + 1) % defaultPhotos.length],
      defaultPhotos[(photoIdx + 2) % defaultPhotos.length],
    ];

    const res = await client.query(
      `insert into public.classes (
        slug, title, category, description, suitable_pins, video_url, cover_image_url, gallery_urls,
        total_sessions, duration_per_session, capacity, price, default_coach_id,
        min_participants, learning_points, sessions_breakdown, requirements,
        published, is_new, sort_order
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      on conflict (slug) do update set
        title = excluded.title,
        category = excluded.category,
        description = excluded.description,
        suitable_pins = excluded.suitable_pins,
        cover_image_url = excluded.cover_image_url,
        gallery_urls = excluded.gallery_urls,
        total_sessions = excluded.total_sessions,
        duration_per_session = excluded.duration_per_session,
        capacity = excluded.capacity,
        price = excluded.price,
        default_coach_id = excluded.default_coach_id,
        learning_points = excluded.learning_points,
        sessions_breakdown = excluded.sessions_breakdown,
        requirements = excluded.requirements,
        published = excluded.published,
        is_new = excluded.is_new,
        sort_order = excluded.sort_order
      returning id;`,
      [
        c.slug,
        c.title,
        c.category,
        c.desc,
        c.suitablePins,
        c.hasVideo ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : null,
        coverUrl,
        galleryUrls,
        c.sessions,
        c.duration,
        c.capacity,
        c.price,
        coachId,
        2,
        c.learningPoints || [],
        JSON.stringify(c.sessionsBreakdown || []),
        c.requirements || ["Raket sendiri (bisa pinjam, bilang pas daftar)", "Sepatu olahraga", "Datang 10 menit sebelum mulai"],
        true, // published
        c.isNew,
        c.sortOrder
      ]
    );

    const classId = res.rows[0].id;

    // Seed schedules strictly matching c.sessions
    const generateDefaultSchedules = (sessions) => {
      if (sessions === 1) {
        return [
          { datesLabel: "Sab, 31 Okt", timeRange: "09.00–10.30", status: "active" },
          { datesLabel: "Sel, 3 Nov", timeRange: "19.00–20.30", status: "active" },
          { datesLabel: "Sab, 7 Nov", timeRange: "09.00–10.30", status: "active" },
        ];
      }
      if (sessions === 2) {
        return [
          { datesLabel: "Sab, 31 Okt & 7 Nov", timeRange: "09.00–10.30", status: "active" },
          { datesLabel: "Sel, 3 & 10 Nov", timeRange: "19.00–20.30", status: "active" },
          { datesLabel: "Sab, 14 & 21 Nov", timeRange: "09.00–10.30", status: "active" },
        ];
      }
      if (sessions === 3) {
        return [
          { datesLabel: "Sab, 24, 31 Okt & 7 Nov", timeRange: "09.00–10.30", status: "active" },
          { datesLabel: "Sel, 3, 10 & 17 Nov", timeRange: "19.00–20.30", status: "active" },
        ];
      }
      if (sessions === 4) {
        return [
          { datesLabel: "Sab, 7, 14, 21 & 28 Nov", timeRange: "09.00–10.30", status: "active" },
          { datesLabel: "Sen, 2, 9, 16 & 23 Nov", timeRange: "19.00–20.30", status: "active" },
        ];
      }
      return [
        { datesLabel: `Sab, 7 Nov (${sessions} Sesi)`, timeRange: "09.00–10.30", status: "active" },
      ];
    };

    const schedulesToInsert =
      c.schedules && c.schedules.length > 0
        ? c.schedules
        : generateDefaultSchedules(c.sessions);

    let firstScheduleId = null;
    for (const s of schedulesToInsert) {
      const schedRes = await client.query(
        `insert into public.class_schedules (
          class_id, coach_id, venue_id, dates_label, time_range, status
        ) values ($1, $2, $3, $4, $5, $6)
        on conflict do nothing
        returning id;`,
        [classId, coachId, defaultVenueId, s.datesLabel, s.timeRange, s.status]
      );
      if (!firstScheduleId && schedRes.rows[0]?.id) {
        firstScheduleId = schedRes.rows[0].id;
      }
    }

    // Seed sample reviews if any
    if (c.reviews && c.reviews.length > 0) {
      for (const r of c.reviews) {
        await client.query(
          `insert into public.class_reviews (
            class_id, author_name, rating, content, created_at, schedule_id
          ) values ($1, $2, $3, $4, $5, $6)
          on conflict do nothing;`,
          [classId, r.author, r.rating, r.content, r.date || new Date().toISOString(), firstScheduleId]
        );
      }
    }

    // Seed sample comments if any
    if (c.comments && c.comments.length > 0) {
      for (const cm of c.comments) {
        const parentRes = await client.query(
          `insert into public.class_comments (
            class_id, author_name, comment
          ) values ($1, $2, $3)
          returning id;`,
          [classId, cm.author, cm.comment]
        );
        const parentId = parentRes.rows[0]?.id;

        if (cm.reply && parentId) {
          await client.query(
            `insert into public.class_comments (
              class_id, author_name, comment, parent_id, coach_id, is_coach_reply
            ) values ($1, $2, $3, $4, $5, true);`,
            [classId, `Coach ${c.coachName || "Lukman"}`, cm.reply, parentId, coachId]
          );
        }
      }
    }
  }

  console.log(`✓ Berhasil seeding ${CLASSES_DATA.length} kelas.`);
  await client.end();
}

async function cleanClasses() {
  await client.connect();
  console.log("Menghapus semua data kelas...");
  const delParticipants = await client.query("delete from public.class_participants");
  const delReviews = await client.query("delete from public.class_reviews");
  const delComments = await client.query("delete from public.class_comments");
  const delSchedules = await client.query("delete from public.class_schedules");
  const delClasses = await client.query("delete from public.classes");

  console.log("✓ Data kelas berhasil dihapus:");
  console.log(`  - classes: ${delClasses.rowCount}`);
  console.log(`  - class_schedules: ${delSchedules.rowCount}`);
  console.log(`  - class_participants: ${delParticipants.rowCount}`);
  console.log(`  - class_reviews: ${delReviews.rowCount}`);
  console.log(`  - class_comments: ${delComments.rowCount}`);
  await client.end();
}

const isClean = process.argv.includes("--clean") || process.argv.includes("--truncate") || process.argv.includes("--reset");

const runner = isClean ? cleanClasses : seedClasses;

runner().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

