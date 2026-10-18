"use server";

import { requireAdminOrCoach } from "@/lib/auth";

const MODEL = "claude-sonnet-5-5";

type RatingInput = { label: string; category: string; score: number };

type GenerateResult = { evaluation?: string; nextPractice?: string; error?: string };

/** "Generate dengan AI" in the coaching editor — drafts evaluasi/latihan berikutnya from the scores
 *  already entered. The coach always reviews and can edit before saving; nothing is auto-submitted. */
export async function generateCoachNote(input: {
  playerName: string;
  gender: "M" | "F";
  level: string;
  ratings: RatingInput[];
}): Promise<GenerateResult> {
  await requireAdminOrCoach();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY belum diatur di server." };

  const ratingsText = input.ratings.length
    ? input.ratings.map((r) => `- ${r.label} (${r.category}): ${r.score}/4`).join("\n")
    : "(belum ada skor yang diisi — tulis catatan umum berdasarkan level saja)";

  const prompt = `Kamu coach padel yang nulis catatan evaluasi singkat buat pemain setelah sesi clinic. Tulis dalam Bahasa Indonesia yang santai, suportif, dan membangun — kaya lagi ngobrol langsung ke pemainnya, bukan laporan formal.

Data pemain:
- Nama: ${input.playerName}
- Level: ${input.level}
- Nilai skill sesi ini (skala 1-4, makin tinggi makin bagus):
${ratingsText}

Balas PERSIS dengan format ini, dua bagian dipisah baris "---" (tanpa bullet/markdown, paragraf biasa, jangan sebut angka skor secara eksplisit):
EVALUASI
(2-4 kalimat: apa yang udah bagus dan apa yang paling perlu dibenerin)
---
LATIHAN BERIKUTNYA
(1-2 kalimat: rekomendasi latihan konkret buat kelemahan paling menonjol)`;

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return { error: "Gagal menghubungi Claude. Coba lagi." };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { error: `Claude API error (${res.status}): ${body.slice(0, 200)}` };
  }

  const data = await res.json();
  const text: string = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n")
    .trim();

  const [rawEval, rawNext] = text.split(/\n?---\n?/);
  const clean = (s: string | undefined) => (s ?? "").replace(/^(EVALUASI|LATIHAN BERIKUTNYA)\s*\n?/i, "").trim();

  return { evaluation: clean(rawEval) || text, nextPractice: clean(rawNext) };
}
