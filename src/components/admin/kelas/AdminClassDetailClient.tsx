"use client";

import { useState } from "react";
import Link from "next/link";
import { formatRupiah, PIN_COLORS, generateWhatsAppReminderUrl } from "@/lib/kelasRules";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import {
  addClassSchedule,
  updateParticipantAttendance,
  replyClassComment,
  toggleHideComment,
  addClassParticipant,
  removeClassParticipant,
} from "@/app/admin/kelas/actions";

export function AdminClassDetailClient({
  classData,
  coaches,
  venues,
  allPlayers = [],
}: {
  classData: any;
  coaches: any[];
  venues: any[];
  allPlayers?: any[];
}) {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    classData.schedules[0]?.id || ""
  );

  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [addPaymentStatus, setAddPaymentStatus] = useState("paid");
  const [submittingPlayerId, setSubmittingPlayerId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const activeSchedule = classData.schedules.find(
    (s: any) => s.id === selectedScheduleId
  ) || classData.schedules[0];

  const participants = activeSchedule?.participants || [];

  const registeredPlayerIds = new Set(
    participants.map((p: any) => p.player_id).filter(Boolean)
  );

  const filteredPlayers = allPlayers.filter((p: any) => {
    if (!playerSearch.trim()) return true;
    const q = playerSearch.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.level && p.level.toLowerCase().includes(q)) ||
      (p.region && p.region.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Back link */}
      <div>
        <Link
          href="/admin/kelas"
          className="text-sm text-snow/70 hover:text-volt no-underline flex items-center gap-1.5"
        >
          ← Kelas
        </Link>
      </div>

      {/* Title & Action Bar */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display font-bold text-2xl md:text-3xl text-snow m-0 leading-tight">
            {classData.title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap text-xs text-snow/70">
            {classData.published ? (
              <Badge tone="volt">● Aktif</Badge>
            ) : (
              <Badge tone="faint">Draft</Badge>
            )}
            <Badge tone="muted">{classData.category}</Badge>
            <div className="flex items-center gap-1">
              {classData.suitablePins.map((pin: string) => (
                <span
                  key={pin}
                  title={`Pin ${pin}`}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: PIN_COLORS[pin]?.bg || "#FFF",
                    border: PIN_COLORS[pin]?.border || "none",
                  }}
                />
              ))}
            </div>
            <span>
              {classData.totalSessions} sesi × {classData.durationPerSession} menit · {formatRupiah(classData.price)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/kelas/${classData.id}/edit`}
            title="Edit kelas"
            className="w-10 h-10 rounded-xl bg-snow/10 hover:bg-snow/20 text-snow flex items-center justify-center no-underline"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 20h4L19 9l-4-4L4 16z" />
              <line x1="13" y1="7" x2="17" y2="11" />
            </svg>
          </Link>
          <Link
            href={`/kelas/${classData.slug}`}
            target="_blank"
            title="Lihat di publik"
            className="w-10 h-10 rounded-xl bg-snow/10 hover:bg-snow/20 text-snow flex items-center justify-center no-underline"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 4h6v6" />
              <line x1="20" y1="4" x2="11" y2="13" />
              <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
            </svg>
          </Link>
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#221F30] rounded-2xl p-4 flex flex-col gap-1">
          <div className="font-display font-bold text-2xl text-snow">{classData.totalParticipants}</div>
          <div className="text-xs text-snow/70">Total peserta</div>
        </div>
        <div className="bg-[#221F30] rounded-2xl p-4 flex flex-col gap-1">
          <div className="font-display font-bold text-2xl text-snow">{classData.averageRating}</div>
          <div className="text-xs text-snow/70">Rating</div>
          <div className="text-[11px] text-snow/55">{classData.totalReviews} ulasan</div>
        </div>
        <div className="bg-[#221F30] rounded-2xl p-4 flex flex-col gap-1">
          <div className="font-display font-bold text-2xl text-snow">{classData.schedules.length}</div>
          <div className="text-xs text-snow/70">Jadwal aktif</div>
          <div className="text-[11px] text-snow/55">Slot teratur</div>
        </div>
        <div className="bg-[#221F30] rounded-2xl p-4 flex flex-col gap-1">
          <div className="font-display font-bold text-2xl text-snow">
            {classData.comments.filter((c: any) => c.replies.length === 0).length}
          </div>
          <div className="text-xs text-snow/70">Komentar belum dibalas</div>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Jadwal & Peserta (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Section Jadwal */}
          <section className="bg-[#1F1C2B] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="font-display font-bold text-lg text-snow m-0">Jadwal</h2>
              <button
                type="button"
                onClick={() => setShowAddSchedule(!showAddSchedule)}
                className="btn px-4 py-2 rounded-lg bg-volt text-[#1B1650] font-bold text-xs tracking-button"
              >
                {showAddSchedule ? "Tutup form" : "+ Tambah jadwal"}
              </button>
            </div>

            {showAddSchedule && (
              <form
                action={async (fd) => {
                  await addClassSchedule(null, fd);
                  setShowAddSchedule(false);
                }}
                className="bg-[#221F30] p-4 rounded-xl border border-snow/10 flex flex-col gap-3"
              >
                <input type="hidden" name="class_id" value={classData.id} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-snow/70">
                      Rentang Tanggal ({classData.totalSessions} Sesi)
                    </span>
                    <input
                      name="dates_label"
                      required
                      placeholder={
                        classData.totalSessions === 1
                          ? "Misal: Sab, 31 Okt"
                          : classData.totalSessions === 2
                          ? "Misal: Sab, 31 Okt & 7 Nov"
                          : classData.totalSessions === 3
                          ? "Misal: Sab, 21, 30 Okt & 3 Nov"
                          : "Misal: Sab, 7, 14, 21 & 28 Nov"
                      }
                      className="bg-snow/10 border-0 rounded-lg px-3 py-2 text-xs text-snow outline-none"
                    />
                    <span className="text-[10px] text-snow/50">
                      Wajib cantumkan {classData.totalSessions} tanggal sesi
                    </span>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-snow/70">Jam (Time Range)</span>
                    <input
                      name="time_range"
                      required
                      placeholder="Misal: 09.00–10.30"
                      className="bg-snow/10 border-0 rounded-lg px-3 py-2 text-xs text-snow outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-snow/70">Coach</span>
                    <select
                      name="coach_id"
                      defaultValue={classData.defaultCoachId || ""}
                      className="bg-snow/10 border-0 rounded-lg px-3 py-2 text-xs text-snow outline-none"
                    >
                      <option value="" className="bg-[#17151F]">Pilih coach...</option>
                      {coaches.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#17151F]">
                          Coach {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-snow/70">Venue</span>
                    <select
                      name="venue_id"
                      className="bg-snow/10 border-0 rounded-lg px-3 py-2 text-xs text-snow outline-none"
                    >
                      {venues.map((v) => (
                        <option key={v.id} value={v.id} className="bg-[#17151F]">
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="submit"
                  className="btn btn-coral py-2 px-4 rounded-lg text-ink font-bold text-xs self-end mt-1 tracking-button"
                >
                  Simpan jadwal
                </button>
              </form>
            )}

            <div className="flex flex-col divide-y divide-snow/10">
              {classData.schedules.length === 0 ? (
                <p className="text-xs text-snow/50 py-3">Belum ada jadwal aktif. Klik "+ Tambah jadwal".</p>
              ) : (
                classData.schedules.map((s: any) => {
                  const isSelected = s.id === (activeSchedule?.id || "");
                  const percentage = Math.min(100, Math.round((s.registeredCount / s.capacity) * 100));
                  return (
                    <div
                      key={s.id}
                      className={`py-3 flex items-center justify-between gap-3 flex-wrap ${
                        isSelected ? "bg-snow/[0.04] px-2 rounded-xl" : ""
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-snow">{s.datesLabel}</div>
                        <div className="text-xs text-snow/70">
                          {s.timeRange} · {s.coachName ? `Coach ${s.coachName}` : "Coach"}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 min-w-24">
                          <div className="w-16 h-1.5 rounded-full bg-snow/15 overflow-hidden">
                            <div
                              className={`h-full ${percentage >= 100 ? "bg-coral" : "bg-volt"}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-snow">
                            {s.registeredCount}/{s.capacity}
                          </span>
                        </div>

                        {s.status === "cancelled" ? (
                          <Badge tone="faint">Dibatalkan</Badge>
                        ) : s.status === "full" || s.registeredCount >= s.capacity ? (
                          <Badge tone="coral">Penuh</Badge>
                        ) : (
                          <Badge tone="volt">● Aktif</Badge>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedScheduleId(s.id)}
                          className={`text-xs font-bold px-2 py-1 rounded cursor-pointer ${
                            isSelected ? "text-volt underline" : "text-snow/70 hover:text-snow"
                          }`}
                        >
                          Peserta
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Section Peserta */}
          <section className="bg-[#1F1C2B] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="font-display font-bold text-lg text-snow m-0">
                Peserta · {activeSchedule?.datesLabel || "Jadwal"}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddError(null);
                    setShowAddParticipant(true);
                  }}
                  disabled={!activeSchedule || participants.length >= (activeSchedule?.capacity || 4)}
                  className="btn px-3 py-1.5 rounded-lg bg-volt text-[#1B1650] text-xs font-bold tracking-button disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  + Tambah peserta
                </button>
                {participants.length > 0 && (
                  <a
                    href={generateWhatsAppReminderUrl(
                      participants[0]?.phone || "628123456789",
                      participants[0]?.name || "Peserta",
                      classData.title,
                      activeSchedule?.datesLabel || "",
                      activeSchedule?.timeRange || "",
                      "East Padel House"
                    )}
                    target="_blank"
                    rel="noopener"
                    className="btn px-3 py-1.5 rounded-lg bg-snow/12 hover:bg-snow/20 text-snow text-xs font-bold tracking-button no-underline"
                  >
                    Kirim pengingat WA
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col divide-y divide-snow/10">
              {participants.length === 0 ? (
                <div className="py-6 text-center text-xs text-snow/50 flex flex-col gap-1">
                  <span>Belum ada peserta terdaftar di jadwal ini.</span>
                  <span className="text-snow/40">Calon peserta dapat mendaftar langsung dari halaman publik.</span>
                </div>
              ) : (
                participants.map((p: any) => {
                  const attendance = p.attendance || {};
                  return (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-snow/10 text-snow font-display font-bold text-xs flex items-center justify-center">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-snow flex items-center gap-1.5">
                            {p.name}
                            <span className="w-2 h-2 rounded-full bg-volt" />
                          </div>
                          <div className="text-[11px] text-volt">
                            {p.payment_status === "paid" ? "Lunas" : "Menunggu bayar"}
                          </div>
                        </div>
                      </div>

                      {/* Attendance checkboxes & delete button */}
                      <div className="flex items-center gap-3">
                        {Array.from({ length: classData.totalSessions }).map((_, idx) => {
                          const sNum = String(idx + 1);
                          const isAttended = !!attendance[sNum];
                          return (
                            <label
                              key={sNum}
                              className="flex items-center gap-1.5 text-xs text-snow/80 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isAttended}
                                onChange={async (e) => {
                                  const fd = new FormData();
                                  fd.set("participant_id", p.id);
                                  fd.set("session_num", sNum);
                                  fd.set("attended", String(e.target.checked));
                                  fd.set("class_id", classData.id);
                                  await updateParticipantAttendance(fd);
                                }}
                                className="w-4 h-4 accent-volt"
                              />
                              Hadir S{sNum}
                            </label>
                          );
                        })}

                        <form
                          action={async (fd) => {
                            if (confirm(`Hapus ${p.name} dari jadwal ini?`)) {
                              await removeClassParticipant(fd);
                            }
                          }}
                        >
                          <input type="hidden" name="participant_id" value={p.id} />
                          <input type="hidden" name="class_id" value={classData.id} />
                          <button
                            type="submit"
                            title="Hapus peserta"
                            className="w-7 h-7 rounded-lg bg-snow/5 hover:bg-coral/20 hover:text-coral text-snow/40 flex items-center justify-center text-xs transition-colors cursor-pointer"
                          >
                            ✕
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-xs text-snow/70 pt-2 border-t border-snow/10">
              {Math.max(0, (activeSchedule?.capacity || 4) - participants.length)} slot kosong
            </div>
          </section>
        </div>

        {/* Right Column: Komentar & Ulasan (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Section Komentar */}
          <section className="bg-[#1F1C2B] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="font-display font-bold text-lg text-snow m-0">Komentar</h2>
              <span className="text-xs text-snow/70">{classData.comments.length} komentar</span>
            </div>

            <div className="flex flex-col gap-3">
              {classData.comments.length === 0 ? (
                <p className="text-xs text-snow/50">Belum ada komentar dari publik.</p>
              ) : (
                classData.comments.map((cm: any) => {
                  const hasReply = cm.replies && cm.replies.length > 0;
                  return (
                    <div
                      key={cm.id}
                      className={`p-3.5 rounded-xl border flex flex-col gap-2.5 ${
                        !hasReply
                          ? "bg-volt/[0.08] border-volt/30"
                          : "bg-snow/[0.02] border-snow/10"
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <b className="text-snow">{cm.authorName}</b>{" "}
                          <span className="text-snow/50">· publik</span>
                        </div>
                        {!hasReply && <Badge tone="volt">Belum dibalas</Badge>}
                      </div>

                      <p className="text-xs md:text-sm text-snow/90 m-0 leading-relaxed">
                        {cm.comment}
                      </p>

                      {/* Existing Coach Reply */}
                      {hasReply && (
                        <div className="bg-snow/5 p-2.5 rounded-lg border-l-2 border-volt text-xs text-snow/80">
                          <b className="text-volt">{cm.replies[0].authorName}:</b> {cm.replies[0].comment}
                        </div>
                      )}

                      {/* Reply Box if unreplied */}
                      {!hasReply && (
                        <div className="flex flex-col gap-2 mt-1">
                          <textarea
                            rows={2}
                            placeholder={`Balas sebagai Coach ${classData.coachName || "Lukman"}...`}
                            value={replyText[cm.id] || ""}
                            onChange={(e) =>
                              setReplyText((prev) => ({ ...prev, [cm.id]: e.target.value }))
                            }
                            className="bg-snow/10 border-0 rounded-lg p-2 text-xs text-snow outline-none focus:ring-1 focus:ring-volt resize-y"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const fd = new FormData();
                                fd.set("comment_id", cm.id);
                                fd.set("class_id", classData.id);
                                await toggleHideComment(fd);
                              }}
                              className="px-2.5 py-1 text-xs rounded bg-snow/10 text-snow/70 hover:text-coral"
                            >
                              Sembunyikan
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const text = replyText[cm.id];
                                if (!text) return;
                                const fd = new FormData();
                                fd.set("class_id", classData.id);
                                fd.set("parent_id", cm.id);
                                fd.set("comment", text);
                                fd.set("coach_name", `Coach ${classData.coachName || "Lukman"}`);
                                await replyClassComment(null, fd);
                                setReplyText((prev) => ({ ...prev, [cm.id]: "" }));
                              }}
                              className="btn btn-coral px-3 py-1 text-xs font-bold text-ink rounded tracking-button"
                            >
                              Balas
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Section Ulasan */}
          <section className="bg-[#1F1C2B] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="font-display font-bold text-lg text-snow m-0">Ulasan</h2>
              <span className="text-xs text-snow/70">
                ★ {classData.averageRating} · {classData.totalReviews} ulasan
              </span>
            </div>

            <div className="flex flex-col divide-y divide-snow/10">
              {classData.reviews.length === 0 ? (
                <p className="text-xs text-snow/50 py-2">Belum ada ulasan.</p>
              ) : (
                classData.reviews.map((r: any) => (
                  <div key={r.id} className="py-3 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <b className="text-snow">{r.authorName}</b>
                      <span className="text-yellow-400">{"★".repeat(r.rating)}</span>
                    </div>
                    <p className="text-xs text-snow/80 m-0 leading-relaxed">{r.content}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
      {/* Player Picker Modal */}
      {showAddParticipant && activeSchedule && (
        <Modal
          title={`Tambah Peserta (${activeSchedule.datesLabel})`}
          onClose={() => {
            setShowAddParticipant(false);
            setPlayerSearch("");
            setAddError(null);
          }}
          width={580}
        >
          <div className="flex flex-col gap-4 text-snow">
            {addError && (
              <div className="p-3 rounded-xl bg-coral/20 border border-coral/30 text-coral text-xs font-semibold">
                {addError}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-snow/70">
              <span>
                Kapasitas: <b className="text-snow">{participants.length} / {activeSchedule.capacity}</b> terisi
              </span>
              <span className="text-volt font-semibold">
                Sisa {Math.max(0, activeSchedule.capacity - participants.length)} slot
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="search"
                autoFocus
                placeholder="Cari nama pemain, level, atau kota..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="w-full bg-snow/10 border-0 rounded-xl px-4 py-2.5 text-sm text-snow placeholder:text-snow/45 focus:outline-none focus:ring-1 focus:ring-volt"
              />
            </div>

            {/* Payment Status option */}
            <div className="flex items-center gap-4 text-xs bg-snow/[0.03] p-2.5 rounded-xl border border-snow/10">
              <span className="text-snow/60">Status Pembayaran:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="modal_payment_status"
                  value="paid"
                  checked={addPaymentStatus === "paid"}
                  onChange={() => setAddPaymentStatus("paid")}
                  className="accent-volt"
                />
                <span className="font-semibold text-volt">Lunas</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="modal_payment_status"
                  value="pending"
                  checked={addPaymentStatus === "pending"}
                  onChange={() => setAddPaymentStatus("pending")}
                  className="accent-volt"
                />
                <span className="text-snow/70">Menunggu bayar</span>
              </label>
            </div>

            {/* Players list */}
            <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1 divide-y divide-snow/5">
              {filteredPlayers.length === 0 ? (
                <div className="py-8 text-center text-xs text-snow/50">
                  Tidak ada pemain ditemukan.
                </div>
              ) : (
                filteredPlayers.map((player: any) => {
                  const isAlreadyRegistered = registeredPlayerIds.has(player.id);
                  const isSlotFull = participants.length >= activeSchedule.capacity;

                  return (
                    <div
                      key={player.id}
                      className="py-2.5 px-2 rounded-xl flex items-center justify-between gap-3 hover:bg-snow/[0.03]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={player.name} photoUrl={player.photo_url} size={34} />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-snow truncate">
                              {player.name}
                            </span>
                            {player.level_color && (
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block flex-none"
                                title={`Pin ${player.level_color}`}
                                style={{
                                  background: PIN_COLORS[player.level_color]?.bg || "#FFF",
                                }}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-2xs text-snow/55">
                            {player.level && <span>Level: {player.level}</span>}
                            {player.region && <span>· {player.region}</span>}
                          </div>
                        </div>
                      </div>

                      {isAlreadyRegistered ? (
                        <span className="text-2xs font-bold text-snow/40 px-2.5 py-1 rounded-full bg-snow/5 border border-snow/10">
                          Terdaftar
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isSlotFull || submittingPlayerId === player.id}
                          onClick={async () => {
                            setSubmittingPlayerId(player.id);
                            setAddError(null);
                            const fd = new FormData();
                            fd.set("class_id", classData.id);
                            fd.set("schedule_id", activeSchedule.id);
                            fd.set("player_id", player.id);
                            fd.set("payment_status", addPaymentStatus);

                            const res = await addClassParticipant(null, fd);
                            setSubmittingPlayerId(null);
                            if (res?.error) {
                              setAddError(res.error);
                            } else {
                              setShowAddParticipant(false);
                            }
                          }}
                          className="btn px-3 py-1.5 rounded-lg bg-volt text-[#1B1650] text-xs font-bold tracking-button disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                        >
                          {submittingPlayerId === player.id ? "Menambahkan..." : "+ Tambah"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
