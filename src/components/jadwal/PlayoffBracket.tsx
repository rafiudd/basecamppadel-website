import type { EventItem, EventMatchesData, KnockoutMatch } from "@/lib/events";

export function PlayoffBracket({
  event,
  matches,
}: {
  event: EventItem;
  matches?: EventMatchesData | null;
}) {
  const isOpen = event.status === "open";
  const isFinished = event.status === "finished";

  // Dynamic Bracket for real events (non-mock)
  if (event.slug !== "battle-september" && event.slug !== "battle-oktober") {
    const allKo: KnockoutMatch[] = [
      ...(matches?.quarterfinals ?? []),
      ...(matches?.knockout ?? []),
    ];

    if (allKo.length === 0) {
      return (
        <section className="border-2 border-dashed border-ink/20 rounded-2xl p-9 md:p-12 text-center text-ink flex flex-col gap-2 items-center bg-white/40">
          <div className="font-display font-bold text-[19px]">Bracket belum terbentuk</div>
          <p className="text-[15px] leading-relaxed text-ink/70 max-w-lg m-0">
            Bracket playoff terisi otomatis setelah match fase grup selesai dan bagan diundi.
          </p>
        </section>
      );
    }

    const stages: { label: string; matches: KnockoutMatch[] }[] = [];
    const r16s = allKo.filter((m) => m.round.toLowerCase().includes("16 besar") || m.round.toLowerCase().includes("r16"));
    const qfs = allKo.filter((m) => m.round.toLowerCase().includes("8 besar") || m.round.toLowerCase().includes("qf"));
    const sfs = allKo.filter((m) => m.round.toLowerCase().includes("semifinal") || m.round.toLowerCase().includes("sf"));
    const finals = allKo.filter((m) => m.round.toLowerCase().startsWith("final") || m.round.toLowerCase() === "final");

    if (r16s.length) stages.push({ label: "16 besar", matches: r16s });
    if (qfs.length) stages.push({ label: "8 besar", matches: qfs });
    if (sfs.length) stages.push({ label: "Semifinal", matches: sfs });
    if (finals.length) stages.push({ label: "Final", matches: finals });

    if (stages.length === 0) {
      stages.push({ label: "Knockout", matches: allKo });
    }

    return (
      <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-4 text-ink shadow-xs">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display font-bold text-[19px] m-0">Bracket playoff</h2>
          <span className="text-xs text-ink/60 md:hidden">
            Geser untuk melihat bagan →
          </span>
        </div>

        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0 pb-3">
          <div className="flex items-start gap-12 min-w-max">
            {stages.map((stg, sIdx) => (
              <div key={sIdx} className="flex flex-col gap-4 w-[280px] sm:w-[300px]">
                <div className="font-display font-bold text-base text-ink pb-1 border-b border-ink/8">
                  {stg.label}
                </div>
                <div className="flex flex-col gap-4">
                  {stg.matches.map((m, mIdx) => (
                    <div key={mIdx} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold tracking-[0.06em] text-ink/60 uppercase">
                        <span>{m.round} · {m.court}</span>
                        {m.status === "live" && (
                          <span className="inline-flex items-center gap-1 text-coral">
                            <span className="w-1.5 h-1.5 rounded-full bg-coral animate-livepulse" />
                            Live
                          </span>
                        )}
                      </div>
                      <div className={`bg-white border ${m.status === "live" ? "ring-2 ring-coral border-coral" : "border-ink/10"} rounded-[10px] overflow-hidden shadow-2xs`}>
                        <div className={`h-10 px-3 flex items-center justify-between ${m.team1.winner ? "bg-[#2f9e5c]/14" : ""}`}>
                          <span className={`text-sm truncate ${m.team1.winner ? "font-bold text-ink" : "font-semibold text-ink/75"}`}>
                            {m.team1.name || "—"}
                          </span>
                          <span className={`font-display font-bold text-base ${m.team1.winner ? "text-[#23794A]" : "text-ink"}`}>
                            {m.team1.score}
                          </span>
                        </div>
                        <div className={`h-10 px-3 flex items-center justify-between border-t border-ink/8 ${m.team2.winner ? "bg-[#2f9e5c]/14" : ""}`}>
                          <span className={`text-sm truncate ${m.team2.winner ? "font-bold text-ink" : "font-semibold text-ink/75"}`}>
                            {m.team2.name || "—"}
                          </span>
                          <span className={`font-display font-bold text-base ${m.team2.winner ? "text-[#23794A]" : "text-ink"}`}>
                            {m.team2.score}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isOpen) {
    return (
      <section className="border-2 border-dashed border-ink/20 rounded-2xl p-9 md:p-12 text-center text-ink flex flex-col gap-2 items-center bg-white/40">
        <div className="font-display font-bold text-[19px]">Bracket belum terbentuk</div>
        <p className="text-[15px] leading-relaxed text-ink/70 max-w-lg m-0">
          Bracket playoff terisi otomatis dari hasil fase grup: 4 grup, top 2 lolos ke 8 besar.
        </p>
      </section>
    );
  }

  // 4-Team Bracket for Finished Tournament (Basecamp Battle September)
  if (isFinished) {
    return (
      <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2.5 text-ink shadow-xs">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display font-bold text-[19px] m-0">Bracket playoff</h2>
        </div>

        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0 pb-3">
          <div style={{ position: "relative", width: "668px", height: "280px", flex: "none" }}>
            <div style={{ position: "absolute", left: "0px", top: 0, width: "300px", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "16px", color: "#17151F" }}>
              Semifinal
            </div>
            <div style={{ position: "absolute", left: "368px", top: 0, width: "300px", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "16px", color: "#17151F" }}>
              Final
            </div>

            <div style={{ position: "absolute", left: 0, top: "36px", width: "668px", height: "244px" }}>
              {/* SF 1 */}
              <div style={{ position: "absolute", left: "0px", top: "0px", width: "300px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 2 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "22px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(23,21,31,0.6)", textTransform: "uppercase" }}>
                    SF1 · Court 1 · 20:00
                  </span>
                </div>
                <div style={{ background: "#FFFFFF", border: "1px solid rgba(23,21,31,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "rgba(47,158,92,0.14)" }}>
                    <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>1</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>A1</span>
                    </span>
                    <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 700, color: "#17151F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Bob Hintama / Angga Aswiyanda
                    </span>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#23794A" }}>6</span>
                  </div>
                  <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent", borderTop: "1px solid rgba(23,21,31,0.08)" }}>
                    <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>4</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>B2</span>
                    </span>
                    <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 600, color: "rgba(23,21,31,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Yonathan / Nauval
                    </span>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "rgba(23,21,31,0.5)" }}>3</span>
                  </div>
                </div>
              </div>

              {/* SF 2 */}
              <div style={{ position: "absolute", left: "0px", top: "128px", width: "300px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 2 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "22px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(23,21,31,0.6)", textTransform: "uppercase" }}>
                    SF2 · Court 2 · 20:00
                  </span>
                </div>
                <div style={{ background: "#FFFFFF", border: "1px solid rgba(23,21,31,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "rgba(47,158,92,0.14)" }}>
                    <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>2</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>B1</span>
                    </span>
                    <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 700, color: "#17151F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Rendi / Fauzi
                    </span>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#23794A" }}>6</span>
                  </div>
                  <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent", borderTop: "1px solid rgba(23,21,31,0.08)" }}>
                    <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>3</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>A2</span>
                    </span>
                    <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 600, color: "rgba(23,21,31,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Dimas / Fikri
                    </span>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "rgba(23,21,31,0.5)" }}>4</span>
                  </div>
                </div>
              </div>

              {/* Connectors SF to Final */}
              <div style={{ position: "absolute", left: "300px", top: "68px", width: "34px", height: "128px", boxSizing: "border-box", border: "2px solid rgba(23,21,31,0.2)", borderLeft: "none", borderRadius: "0 6px 6px 0" }} />
              <div style={{ position: "absolute", left: "334px", top: "131px", width: "34px", height: "2px", background: "rgba(23,21,31,0.2)" }} />

              {/* Final */}
              <div style={{ position: "absolute", left: "368px", top: "64px", width: "300px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 2 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "22px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(23,21,31,0.6)", textTransform: "uppercase" }}>
                    Final · Court 1 · 20:40
                  </span>
                </div>
                <div style={{ background: "#FFFFFF", border: "1px solid rgba(23,21,31,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "rgba(47,158,92,0.14)" }}>
                    <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>1</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>A1</span>
                    </span>
                    <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 700, color: "#17151F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Bob Hintama / Angga Aswiyanda
                    </span>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#23794A" }}>6</span>
                  </div>
                  <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent", borderTop: "1px solid rgba(23,21,31,0.08)" }}>
                    <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                      <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>2</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>B1</span>
                    </span>
                    <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 600, color: "rgba(23,21,31,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Rendi / Fauzi
                    </span>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "rgba(23,21,31,0.5)" }}>4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 8-Team 3-Column Bracket with SF1 LIVE (Basecamp Battle Oktober #1)
  return (
    <section className="bg-white border border-ink/8 rounded-2xl p-6 flex flex-col gap-2.5 text-ink shadow-xs">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display font-bold text-[19px] m-0">Bracket playoff</h2>
        <span className="text-xs text-ink/60 md:hidden">
          Geser untuk melihat bagan →
        </span>
      </div>

      <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0 pb-3">
        <div style={{ position: "relative", width: "1036px", height: "536px", flex: "none" }}>
          {/* Column Headers */}
          <div style={{ position: "absolute", left: "0px", top: 0, width: "300px", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "16px", color: "#17151F" }}>
            8 besar
          </div>
          <div style={{ position: "absolute", left: "368px", top: 0, width: "300px", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "16px", color: "#17151F" }}>
            Semifinal
          </div>
          <div style={{ position: "absolute", left: "736px", top: 0, width: "300px", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "16px", color: "#17151F" }}>
            Final
          </div>

          <div style={{ position: "absolute", left: 0, top: "36px", width: "1036px", height: "500px" }}>
            {/* QF 1 */}
            <div style={{ position: "absolute", left: "0px", top: "0px", width: "300px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "22px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(23,21,31,0.6)", textTransform: "uppercase" }}>
                  8 besar · QF1
                </span>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(23,21,31,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "rgba(47,158,92,0.14)" }}>
                  <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>1</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>A1</span>
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 700, color: "#17151F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Rayhan / Andra
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#23794A" }}>6</span>
                </div>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent", borderTop: "1px solid rgba(23,21,31,0.08)" }}>
                  <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>8</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>D2</span>
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 600, color: "rgba(23,21,31,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Agung Setiadi / Fajar SSA
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "rgba(23,21,31,0.5)" }}>2</span>
                </div>
              </div>
            </div>

            {/* QF 2 */}
            <div style={{ position: "absolute", left: "0px", top: "128px", width: "300px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "22px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(23,21,31,0.6)", textTransform: "uppercase" }}>
                  8 besar · QF2
                </span>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(23,21,31,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent" }}>
                  <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>4</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>D1</span>
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 600, color: "rgba(23,21,31,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Yonathan / Nauval
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "rgba(23,21,31,0.5)" }}>4</span>
                </div>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "rgba(47,158,92,0.14)", borderTop: "1px solid rgba(23,21,31,0.08)" }}>
                  <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>5</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>A2</span>
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 700, color: "#17151F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Pao Pao / Temmy
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#23794A" }}>6</span>
                </div>
              </div>
            </div>

            {/* QF 3 */}
            <div style={{ position: "absolute", left: "0px", top: "256px", width: "300px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "22px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(23,21,31,0.6)", textTransform: "uppercase" }}>
                  8 besar · QF3
                </span>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(23,21,31,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "rgba(47,158,92,0.14)" }}>
                  <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>3</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>C1</span>
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 700, color: "#17151F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Rendi / Fauzi
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#23794A" }}>6</span>
                </div>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent", borderTop: "1px solid rgba(23,21,31,0.08)" }}>
                  <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>6</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>C2</span>
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 600, color: "rgba(23,21,31,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Albert / Temen Fajar
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "rgba(23,21,31,0.5)" }}>4</span>
                </div>
              </div>
            </div>

            {/* QF 4 */}
            <div style={{ position: "absolute", left: "0px", top: "384px", width: "300px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "22px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(23,21,31,0.6)", textTransform: "uppercase" }}>
                  8 besar · QF4
                </span>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(23,21,31,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "rgba(47,158,92,0.14)" }}>
                  <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>2</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>B1</span>
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 700, color: "#17151F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Bob Hintama / Angga Aswiyanda
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#23794A" }}>6</span>
                </div>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent", borderTop: "1px solid rgba(23,21,31,0.08)" }}>
                  <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>7</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>B2</span>
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 600, color: "rgba(23,21,31,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Dimas / Fikri
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "rgba(23,21,31,0.5)" }}>3</span>
                </div>
              </div>
            </div>

            {/* Connector lines from QF to SF */}
            <div style={{ position: "absolute", left: "300px", top: "68px", width: "34px", height: "128px", boxSizing: "border-box", border: "2px solid rgba(23,21,31,0.2)", borderLeft: "none", borderRadius: "0 6px 6px 0" }} />
            <div style={{ position: "absolute", left: "334px", top: "131px", width: "34px", height: "2px", background: "rgba(23,21,31,0.2)" }} />

            <div style={{ position: "absolute", left: "300px", top: "324px", width: "34px", height: "128px", boxSizing: "border-box", border: "2px solid rgba(23,21,31,0.2)", borderLeft: "none", borderRadius: "0 6px 6px 0" }} />
            <div style={{ position: "absolute", left: "334px", top: "387px", width: "34px", height: "2px", background: "rgba(23,21,31,0.2)" }} />

            {/* SF 1: LIVE MATCH WITH CORAL GLOW BORDER & LIVE PULSE INDICATOR */}
            <div style={{ position: "absolute", left: "368px", top: "64px", width: "300px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "22px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(23,21,31,0.6)", textTransform: "uppercase" }}>
                  SF1 · Court 1 · 20:00
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 700, color: "#B8321A" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "999px", background: "#FF5A3C" }} className="animate-livepulse" />
                  LIVE
                </span>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(23,21,31,0.1)", borderRadius: "10px", overflow: "hidden", boxShadow: "0 0 0 2px #FF5A3C" }}>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent" }}>
                  <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>1</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>A1</span>
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 600, color: "#17151F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Rayhan / Andra
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#17151F" }}>3</span>
                </div>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent", borderTop: "1px solid rgba(23,21,31,0.08)" }}>
                  <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>5</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>A2</span>
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 600, color: "#17151F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Pao Pao / Temmy
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#17151F" }}>2</span>
                </div>
              </div>
            </div>

            {/* SF 2 */}
            <div style={{ position: "absolute", left: "368px", top: "320px", width: "300px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "22px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(23,21,31,0.6)", textTransform: "uppercase" }}>
                  SF2 · Court 2 · 20:00
                </span>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(23,21,31,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent" }}>
                  <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>3</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>C1</span>
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 600, color: "#17151F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Rendi / Fauzi
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#17151F" }} />
                </div>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent", borderTop: "1px solid rgba(23,21,31,0.08)" }}>
                  <span style={{ flex: "none", width: "32px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "13px" }}>2</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(23,21,31,0.55)" }}>B1</span>
                  </span>
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 600, color: "#17151F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Bob Hintama / Angga Aswiyanda
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#17151F" }} />
                </div>
              </div>
            </div>

            {/* Connectors SF to Final */}
            <div style={{ position: "absolute", left: "668px", top: "132px", width: "34px", height: "256px", boxSizing: "border-box", border: "2px solid rgba(23,21,31,0.2)", borderLeft: "none", borderRadius: "0 6px 6px 0" }} />
            <div style={{ position: "absolute", left: "702px", top: "259px", width: "34px", height: "2px", background: "rgba(23,21,31,0.2)" }} />

            {/* Final */}
            <div style={{ position: "absolute", left: "736px", top: "192px", width: "300px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "22px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(23,21,31,0.6)", textTransform: "uppercase" }}>
                  Final · Court 1 · 20:40
                </span>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(23,21,31,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent" }}>
                  <span style={{ flex: "none", width: "32px" }} />
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 500, color: "rgba(23,21,31,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Pemenang SF1
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#17151F" }} />
                </div>
                <div style={{ height: "40px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "8px", paddingRight: "12px", background: "transparent", borderTop: "1px solid rgba(23,21,31,0.08)" }}>
                  <span style={{ flex: "none", width: "32px" }} />
                  <span style={{ flexGrow: 1, minWidth: 0, fontSize: "14px", fontWeight: 500, color: "rgba(23,21,31,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Pemenang SF2
                  </span>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "15px", color: "#17151F" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
