/**
 * The A4 coaching rapor, same layout and CSS as the hand-made BASECAMP_CLINIC_<NAME>_5_OKT files.
 * Pure (no imports) so it is unit-tested; every value is HTML-escaped.
 */

export type RaporData = {
  fileName: string; // also the <title>, which Chrome uses as the "Save as PDF" file name
  name: string;
  date: string; // yyyy-mm-dd
  coaches: string[];
  average: number;
  averageLabel: string;
  best: string[];
  weakest: string[];
  ratings: { label: string; score: number; scoreLabel: string }[];
  evaluation: string[];
  nextPractice: string[];
};

const MONTHS = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const STYLE = `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap");
*{margin:0;padding:0;box-sizing:border-box}@page{size:A4;margin:0}
body{font-family:Inter,sans-serif;color:#17151F;background:#FBF7F1;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;height:297mm;display:flex;flex-direction:column;overflow:hidden}
.D{font-family:'Space Grotesk';font-weight:700}
.top{flex-shrink:0;background:#1B1650;color:#FBF7F1;padding:11mm 14mm 9mm;position:relative;overflow:hidden}
.top:after{content:"";position:absolute;right:-34mm;top:-6mm;width:80mm;height:80mm;border-radius:50%;background:#FF5A3C;opacity:.9}
.lg{display:flex;align-items:center;gap:10px;position:relative;z-index:1}.lg .D{font-size:15px;line-height:1}.lg span{color:#FF5A3C}
.ev{margin-top:7mm;font-size:11px;letter-spacing:3px;color:#FFD43B;font-weight:600;position:relative;z-index:1}
.nm{font-size:52px;line-height:1;margin-top:3mm;letter-spacing:-1.5px;position:relative;z-index:1}
.body{padding:8mm 14mm 0;display:flex;flex-direction:column;gap:4.5mm;flex:1;min-height:0}
.row{display:flex;gap:6mm}
.card{background:#fff;border:1px solid #E3E1EA;border-radius:12px;padding:4.5mm 6mm}
.h{font-family:'Space Grotesk';font-weight:700;font-size:15px;color:#1B1650;margin-bottom:2.5mm;display:flex;justify-content:space-between;align-items:baseline}
.h small{font-family:Inter;font-weight:500;font-size:10px;color:#6B6880}
.big{font-family:'Space Grotesk';font-weight:700;font-size:50px;line-height:1;color:#1B1650}.big span{font-size:20px;color:#8A869A}
.br{display:grid;grid-template-columns:30mm 1fr 9mm 30mm;align-items:center;gap:3mm;padding:1.15mm 0;border-bottom:1px solid #F0EEF5}.br:last-child{border:0}
.bl{font-weight:600;font-size:12.5px}.bv{font-family:'Space Grotesk';font-weight:700;font-size:15px;text-align:right;color:#1B1650}.bt{font-size:10.5px;color:#6B6880}
.tr{display:grid;grid-template-columns:repeat(5,1fr);gap:2px}
.sg{height:10px;background:#ECEAF3;border-radius:2px}.sg:first-child{border-radius:4px 2px 2px 4px}.sg:last-child{border-radius:2px 4px 4px 2px}
.sg.on{background:#1B1650}.sg.hf{background:linear-gradient(90deg,#1B1650 50%,#ECEAF3 50%)}
.dt{background:#1B1650;color:#FBF7F1;border:1px solid rgba(251,247,241,.35);font-family:'Space Grotesk';font-weight:700;font-size:11px;letter-spacing:2px;padding:6px 12px;border-radius:999px}
.cf{display:flex;align-items:center;gap:8px;margin-top:4mm;position:relative;z-index:1}.cl{font-size:10px;letter-spacing:3px;color:#B7B2D6;font-weight:600;margin-right:4px}.cp{background:rgba(251,247,241,.12);border:1px solid rgba(251,247,241,.3);color:#FBF7F1;font-weight:700;font-size:13px;padding:5px 14px;border-radius:999px}
.tag.tl{background:#FFE9E4;color:#B83A22}.ig{display:flex;align-items:center;gap:8px;font-size:13px}
.tag{display:inline-block;background:#E8F5EC;color:#166534;border-radius:6px;padding:4px 10px;font-weight:700;font-size:13px;margin:0 4px 4px 0}
.nc{font-weight:700;font-size:11px;letter-spacing:1px;color:#FF5A3C;text-transform:uppercase}
ul{margin:1.5mm 0 0 4.5mm;font-size:12.5px;line-height:1.55}li+li{margin-top:1.5mm}ul.dr{list-style:none;margin-left:0}ul.dr li{padding-left:5mm;position:relative}ul.dr li:before{content:'→';position:absolute;left:0;color:#16A34A;font-weight:700}
.leg{font-size:9.5px;color:#6B6880;display:flex;gap:10px;flex-wrap:wrap}
.ft{flex-shrink:0;margin-top:auto;background:#1B1650;color:#D9D5EA;padding:5mm 14mm;font-size:11px;display:flex;justify-content:space-between;align-items:center}.ft b{color:#FBF7F1}
@media screen{html{background:#DAD7E3}.pg{margin:16px auto;box-shadow:0 10px 40px rgba(0,0,0,.2)}}`;

function segments(score: number) {
  return [1, 2, 3, 4, 5]
    .map((i) => `<i class="sg${score >= i ? " on" : score > i - 1 ? " hf" : ""}"></i>`)
    .join("");
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

export function raporHtml(d: RaporData): string {
  const e = escapeHtml;
  const [y, m, day] = d.date.slice(0, 10).split("-").map(Number);
  const tags = (list: string[], cls: string) => list.map((t) => `<span class="${cls}">${e(t)}</span>`).join("");
  const items = (list: string[]) => list.map((t) => `<li>${e(t)}</li>`).join("");
  const coachNote = d.coaches.length ? `dari Coach ${e(d.coaches.join(" + "))}` : "";

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${e(d.fileName)}</title><style>${STYLE}</style></head><body><div class="pg">
<div class="top"><div style="display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1"><div class="lg"><svg width="44" height="44" viewBox="0 0 40 40"><circle cx="24" cy="13" r="5" fill="#FFD43B"/><polygon points="25,13 16,30 34,30" fill="#FBF7F1"/><polygon points="17,14 7,30 27,30" fill="#FF5A3C"/></svg><div class="D"><span>BASECAMP</span><br>PADEL</div></div><div class="dt">${day} ${MONTHS[m - 1]} ${y}</div></div>
<div class="ev">RAPOR MABAR WITH COACH</div>
<div class="nm D">${e(d.name)}</div>
${d.coaches.length ? `<div class="cf"><span class="cl">COACH</span>${tags(d.coaches, "cp")}</div>` : ""}</div>
<div class="body">
<div class="row">
 <div class="card" style="width:52mm;display:flex;flex-direction:column;justify-content:space-between"><div class="h" style="margin:0">Nilai rata-rata</div><div class="big">${fmt(d.average)}<span> / 5</span></div><div style="font-size:12px;font-weight:600;color:#6B6880">${e(d.averageLabel)}</div></div>
 <div class="card" style="flex:1"><div class="h">Paling bagus 💪</div><div>${tags(d.best, "tag") || "–"}</div>
  ${d.weakest.length ? `<div class="h" style="margin-top:3mm">Perlu dilatih 🎯</div><div>${tags(d.weakest, "tag tl")}</div>` : ""}</div>
</div>
<div class="card"><div class="h">Nilai per teknik<small>1–5</small></div>${d.ratings
    .map((r) => `<div class="br"><span class="bl">${e(r.label)}</span><div class="tr">${segments(r.score)}</div><span class="bv">${fmt(r.score)}</span><span class="bt">${e(r.scoreLabel)}</span></div>`)
    .join("")}
<div class="leg" style="margin-top:3mm">1 Belum bisa · 2 Mulai bisa · 3 Lumayan · 4 Bagus · 5 Mantap</div></div>
${d.evaluation.length || d.nextPractice.length ? `<div class="card"><div class="h">Catatan &amp; evaluasi<small>${coachNote}</small></div>
<div style="display:grid;grid-template-columns:1.55fr 1fr;gap:7mm">
<div><div class="nc">Evaluasi</div><ul>${items(d.evaluation)}</ul></div>
<div><div class="nc" style="color:#16A34A">Latihan berikutnya</div><ul class="dr">${items(d.nextPractice)}</ul></div>
</div></div>` : ""}
</div>
<div class="ft"><span>Makasih udah ikut! Sampai ketemu lagi 🎾</span><span class="ig"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBF7F1" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="#FBF7F1" stroke="none"/></svg><b>@basecamppadel.id</b></span></div>
</div>
<script>addEventListener("load",function(){(document.fonts?document.fonts.ready:Promise.resolve()).then(function(){setTimeout(function(){print()},150)})})</script>
</body></html>`;
}
