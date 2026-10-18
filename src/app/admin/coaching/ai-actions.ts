"use server";

import { requireAdminOrCoach } from "@/lib/auth";

const MODEL = "gpt-4o";

type RatingInput = { label: string; category: string; score: number };

type GenerateResult = { evaluation?: string; nextPractice?: string; error?: string };

/** "Generate dengan AI" in the coaching editor — drafts evaluasi/latihan berikutnya from the scores
 *  already entered, via ChatGPT. The coach always reviews and can edit before saving; nothing is
 *  auto-submitted. */
export async function generateCoachNote(input: {
  playerName: string;
  gender: "M" | "F";
  level: string;
  ratings: RatingInput[];
  /** Whatever the coach already typed in the two fields before hitting Generate, if anything — the
   *  draft should build on this, not ignore it and invent an unrelated evaluation. */
  existingEvaluation?: string;
  existingNextPractice?: string;
}): Promise<GenerateResult> {
  await requireAdminOrCoach();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: "OPENAI_API_KEY belum diatur di server." };

  const ratingsText = input.ratings.length
    ? input.ratings.map((r) => `- ${r.label} (${r.category}): ${r.score}/4`).join("\n")
    : "(belum ada skor yang diisi — tulis catatan umum berdasarkan level saja)";

  const hasDraft = (input.existingEvaluation ?? "").trim() || (input.existingNextPractice ?? "").trim();
  const draftBlock = hasDraft
    ? `\nCoach udah sempat nulis coretan/catatan singkat sebelum ini — JADIKAN INI BAHAN UTAMA, jangan diabaikan atau diganti topiknya dengan hal lain. Tugas kamu di sini cuma mengembangkan coretan ini jadi kalimat yang lebih lengkap dan enak dibaca sesuai formatnya, BUKAN bikin evaluasi baru yang nggak nyambung sama apa yang udah ditulis coach:
- Coretan evaluasi: "${(input.existingEvaluation ?? "").trim() || "(kosong)"}"
- Coretan latihan berikutnya: "${(input.existingNextPractice ?? "").trim() || "(kosong)"}"
`
    : "";

  const prompt = `Kamu coach padel yang nulis catatan evaluasi singkat buat pemain setelah sesi clinic. Tulis dalam Bahasa Indonesia yang santai, suportif, dan membangun — kaya lagi ngobrol langsung ke pemainnya, bukan laporan formal.

Data pemain:
- Nama: ${input.playerName}
- Level: ${input.level}
- Nilai skill sesi ini (skala 1-4, makin tinggi makin bagus):
${ratingsText}
${draftBlock}
Balas PERSIS dengan format ini, dua bagian dipisah baris "---" (tanpa bullet/markdown, paragraf biasa, jangan sebut angka skor secara eksplisit):
EVALUASI
(2-4 kalimat, urutannya: mulai dengan pujian tulus soal apa yang udah bagus/progress yang keliatan, baru habis itu kasih feedback soal yang paling perlu dibenerin — sampaikan dengan empati, bukan menggurui atau terkesan nge-judge, kaya coach yang beneran peduli sama perkembangan pemainnya)
---
LATIHAN BERIKUTNYA
(1-2 kalimat: rekomendasi latihan konkret buat kelemahan paling menonjol)`;

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return { error: "Gagal menghubungi ChatGPT. Coba lagi." };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { error: `OpenAI API error (${res.status}): ${body.slice(0, 200)}` };
  }

  const data = await res.json();
  const text: string = String(data.choices?.[0]?.message?.content ?? "").trim();

  const [rawEval, rawNext] = text.split(/-{2,}/);
  // trim first so the label-strip regex's `^` anchor lands on the label, not on leftover blank lines
  const clean = (s: string | undefined) => (s ?? "").trim().replace(/^\**(EVALUASI|LATIHAN BERIKUTNYA)\**:?\s*/i, "").trim();

  return { evaluation: clean(rawEval) || text, nextPractice: clean(rawNext) };
}
