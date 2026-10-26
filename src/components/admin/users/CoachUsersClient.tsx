"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/admin/ActionForm";
import { CoachUserForm, type CoachUserItem } from "@/components/admin/users/CoachUserForm";
import { deleteCoach } from "@/app/admin/users/actions";
import { MOBILE_CARD } from "@/components/admin/cardStyles";
import { ActiveBadge } from "@/components/ui/Badge";
import { TrashIcon } from "@/components/ui/icons";
import { formatDateShortIndo } from "@/lib/format";

export function CoachUsersClient({
  coaches,
}: {
  coaches: CoachUserItem[];
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingCoach, setEditingCoach] = useState<CoachUserItem | null>(null);
  const [deletingCoach, setDeletingCoach] = useState<CoachUserItem | null>(null);
  const [selectedResume, setSelectedResume] = useState<CoachUserItem | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const activeCount = coaches.filter((c) => c.active).length;

  const closeModal = () => {
    setIsCreating(false);
    setEditingCoach(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Coach"
        description={`${activeCount} dari ${coaches.length} coach aktif. Kelola master data pelatih dan akses login mereka untuk sesi Coaching & Kelas.`}
        actions={
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="btn btn-coral text-ink tracking-button whitespace-nowrap"
          >
            + Tambah Coach
          </button>
        }
      />

      <div>
        <table className="hidden md:table w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-snow/65 uppercase tracking-table">
              <th className="pb-2.5 pr-3 font-semibold">Nama Coach</th>
              <th className="pb-2.5 pr-3 font-semibold">Status</th>
              <th className="pb-2.5 pr-3 font-semibold">Akun Login</th>
              <th className="pb-2.5 pr-3 font-semibold">Resume Aktivitas</th>
              <th className="pb-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((c) => {
              const res = c.resume;
              const hasActivity = res && (res.coachingSessionsCount > 0 || res.classesCount > 0);

              return (
                <tr key={c.id} className="border-t border-snow/10">
                  <td className="py-3 pr-3 font-display font-bold whitespace-nowrap">
                    <span className={c.active ? "" : "text-snow/50"}>{c.name}</span>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <ActiveBadge active={c.active} />
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {c.email ? (
                      <span className="text-snow/90 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-volt flex-none" />
                        {c.email}
                      </span>
                    ) : (
                      <span className="text-snow/40 text-xs italic">Belum ada akun login</span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    {hasActivity ? (
                      <div className="flex flex-col gap-1 items-start">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {res.coachingSessionsCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-volt/10 text-volt border border-volt/20">
                              <span>🎾</span> {res.coachingSessionsCount} Sesi Coaching
                            </span>
                          )}
                          {res.classesCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-coral/10 text-coral border border-coral/20">
                              <span>🎓</span> {res.classesCount} Kelas ({res.classSchedulesCount} Jadwal)
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedResume(c)}
                          className="text-2xs text-snow/60 hover:text-volt underline decoration-snow/30 hover:decoration-volt underline-offset-2 tracking-wide"
                        >
                          Lihat rincian aktivitas →
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-snow/40 italic">Belum ada riwayat sesi / kelas</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingCoach(c)}
                        className="btn min-h-10 px-4 tracking-button text-snow"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCoach(c)}
                        aria-label={`Hapus ${c.name}`}
                        className="w-10 h-10 rounded-lg bg-transparent border-none text-snow/70 hover:text-loss flex items-center justify-center p-0 flex-none"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="md:hidden flex flex-col gap-2">
          {coaches.map((c) => {
            const res = c.resume;
            const hasActivity = res && (res.coachingSessionsCount > 0 || res.classesCount > 0);

            return (
              <div key={c.id} className={`${MOBILE_CARD} flex flex-col gap-3`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-bold text-base flex items-center gap-2">
                    <span className={c.active ? "" : "text-snow/50"}>{c.name}</span>
                    <ActiveBadge active={c.active} />
                  </div>
                </div>

                <div className="text-sm">
                  {c.email ? (
                    <span className="text-snow/90 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-volt flex-none" />
                      {c.email}
                    </span>
                  ) : (
                    <span className="text-snow/40 text-xs italic">Belum ada akun login</span>
                  )}
                </div>

                {/* Resume Aktivitas Section */}
                <div className="p-3 rounded-xl bg-ink/40 border border-snow/6 flex flex-col gap-2">
                  <div className="text-2xs uppercase tracking-wider font-semibold text-snow/50">
                    Resume Aktivitas
                  </div>
                  {hasActivity ? (
                    <>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {res.coachingSessionsCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-volt/10 text-volt border border-volt/20">
                            <span>🎾</span> {res.coachingSessionsCount} Sesi Coaching
                          </span>
                        )}
                        {res.classesCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-coral/10 text-coral border border-coral/20">
                            <span>🎓</span> {res.classesCount} Kelas ({res.classSchedulesCount} Jadwal)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedResume(c)}
                        className="text-xs text-volt hover:underline text-left font-medium mt-0.5"
                      >
                        Lihat rincian aktivitas →
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-snow/40 italic">Belum ada riwayat sesi / kelas</span>
                  )}
                </div>

                <div className="flex items-center gap-2 justify-end pt-2 border-t border-snow/8">
                  <button
                    type="button"
                    onClick={() => setEditingCoach(c)}
                    className="btn min-h-9 px-4 tracking-button text-snow text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCoach(c)}
                    aria-label={`Hapus ${c.name}`}
                    className="w-9 h-9 rounded-lg bg-transparent border-none text-snow/70 hover:text-loss flex items-center justify-center p-0 flex-none"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {coaches.length === 0 && (
          <p className="text-sm text-snow/50 mt-3">Belum ada data coach.</p>
        )}
      </div>

      {/* Detail Resume Modal */}
      {selectedResume?.resume && (
        <Modal
          title={`Resume Aktivitas · ${selectedResume.name}`}
          onClose={() => setSelectedResume(null)}
          width={600}
        >
          <div className="flex flex-col gap-5">
            {/* Highlights Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-ink-2 border border-snow/10 flex flex-col gap-1">
                <div className="text-2xs uppercase tracking-wider font-semibold text-snow/60 flex items-center gap-1.5">
                  <span>🎾</span> Sesi Coaching
                </div>
                <div className="text-2xl font-bold font-display text-volt">
                  {selectedResume.resume.coachingSessionsCount}{" "}
                  <span className="text-xs font-normal text-snow/70">Sesi</span>
                </div>
                <div className="text-2xs text-snow/50">
                  {selectedResume.resume.assessmentsCount} penilaian pemain · {selectedResume.resume.coachingGroupsCount} grup
                </div>
              </div>

              <div className="p-4 rounded-xl bg-ink-2 border border-snow/10 flex flex-col gap-1">
                <div className="text-2xs uppercase tracking-wider font-semibold text-snow/60 flex items-center gap-1.5">
                  <span>🎓</span> Kelas yang Diampu
                </div>
                <div className="text-2xl font-bold font-display text-coral">
                  {selectedResume.resume.classesCount}{" "}
                  <span className="text-xs font-normal text-snow/70">Kelas</span>
                </div>
                <div className="text-2xs text-snow/50">
                  {selectedResume.resume.classSchedulesCount} total jadwal sesi
                </div>
              </div>
            </div>

            {/* Kelas Detail List */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-snow/70 flex items-center justify-between">
                <span>Daftar Kelas yang Diampu</span>
                <span className="text-2xs font-normal text-snow/40">
                  {selectedResume.resume.classes.length} kelas
                </span>
              </div>
              {selectedResume.resume.classes.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-snow/10 divide-y divide-snow/8 bg-ink-2/50">
                  {selectedResume.resume.classes.map((cls) => (
                    <div key={cls.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="font-semibold text-snow truncate">{cls.title}</div>
                        <div className="text-2xs text-snow/50 flex items-center gap-2">
                          {cls.category && <span>Kategori: {cls.category}</span>}
                          {cls.isDefaultCoach && (
                            <span className="text-volt">★ Coach Utama</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-snow/80 whitespace-nowrap bg-snow/8 px-2.5 py-1 rounded-md flex-none">
                        {cls.schedulesCount} Jadwal Sesi
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-snow/6 bg-ink-2/30 text-xs text-snow/40 italic">
                  Coach ini belum terdaftar pada kelas manapun.
                </div>
              )}
            </div>

            {/* Coaching Sessions History */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-snow/70 flex items-center justify-between">
                <span>Riwayat Sesi Coaching Clinic</span>
                <span className="text-2xs font-normal text-snow/40">
                  {selectedResume.resume.coachingSessions.length} sesi
                </span>
              </div>
              {selectedResume.resume.coachingSessions.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-snow/10 divide-y divide-snow/8 bg-ink-2/50">
                  {selectedResume.resume.coachingSessions.map((s) => (
                    <div key={s.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="font-semibold text-snow truncate">{s.title}</div>
                        <div className="text-2xs text-snow/50 flex items-center gap-2">
                          {s.session_date && <span>{formatDateShortIndo(s.session_date)}</span>}
                          {s.venue_name && <span>· {s.venue_name}</span>}
                        </div>
                      </div>
                      <div className="text-2xs text-snow/70 uppercase tracking-wider px-2 py-0.5 rounded bg-snow/8 flex-none font-medium">
                        {s.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-snow/6 bg-ink-2/30 text-xs text-snow/40 italic">
                  Coach ini belum pernah memimpin sesi coaching clinic.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-snow/10">
              <button
                type="button"
                onClick={() => setSelectedResume(null)}
                className="btn btn-coral text-ink min-h-10 px-5 text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Modal */}
      {(isCreating || editingCoach) && (
        <Modal
          title={editingCoach ? `Edit ${editingCoach.name}` : "Tambah Coach"}
          onClose={closeModal}
          width={540}
        >
          <CoachUserForm
            key={editingCoach?.id ?? "new"}
            coach={editingCoach ?? undefined}
            onClose={closeModal}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCoach && (
        <Modal
          title="Hapus Coach"
          onClose={() => setDeletingCoach(null)}
          width={420}
        >
          <ActionForm
            action={async (state, fd) => {
              const res = await deleteCoach(state, fd);
              if (!res?.error) {
                setDeletingCoach(null);
              }
              return res;
            }}
            successText="Coach berhasil dihapus"
            onSuccess={() => setDeletingCoach(null)}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="id" value={deletingCoach.id} />
            <p className="text-sm leading-relaxed text-snow/80 m-0">
              Apakah Anda yakin ingin menghapus coach{" "}
              <strong className="text-snow">{deletingCoach.name}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCoach(null)}
                className="btn bg-transparent text-snow/85 min-h-10"
              >
                Batal
              </button>
              <button type="submit" className="btn btn-danger min-h-10">
                Ya, Hapus
              </button>
            </div>
          </ActionForm>
        </Modal>
      )}
    </div>
  );
}
