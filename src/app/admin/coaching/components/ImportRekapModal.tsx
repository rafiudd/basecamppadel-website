"use client";

import { unwrap } from "@/lib/actionState";
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import type { CoachingSkill, Player } from "@/lib/database.types";
import { parseRekapClinicExcel, generateRekapTemplateExcel, type RekapRowPreview } from "@/lib/coaching-excel";
import { useEffect } from "react";
import { importRekapDraftsAction, getActivePlayersForCoachingAction } from "../actions";
import { toast } from "@/components/ui/Toast";

export function ImportRekapModal({
  sessionId,
  skills,
  players,
  onClose,
  onSuccess,
}: {
  sessionId: string;
  skills: CoachingSkill[];
  players?: Player[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<RekapRowPreview[]>([]);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activePlayers, setActivePlayers] = useState<Player[]>(players ?? []);

  useEffect(() => {
    if (!players || players.length === 0) {
      getActivePlayersForCoachingAction().then((res) => {
        if (!("error" in res)) {
          setActivePlayers(res as unknown as Player[]);
        }
      });
    }
  }, [players]);

  const handleDownloadTemplate = async () => {
    try {
      const buffer = await generateRekapTemplateExcel(skills);
      const blob = new Blob([buffer as unknown as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Template-Rekap-Coaching-Basecamp.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Template Excel rekap clinic berhasil diunduh");
    } catch {
      toast.error("Gagal mengunduh template Excel");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsParsing(true);
    setError(null);

    try {
      let candidatePlayers = activePlayers;
      if (candidatePlayers.length === 0) {
        const resPlayers = await getActivePlayersForCoachingAction();
        if (!("error" in resPlayers)) {
          candidatePlayers = resPlayers as unknown as Player[];
          setActivePlayers(candidatePlayers);
        }
      }

      const buffer = await selectedFile.arrayBuffer();
      const res = await parseRekapClinicExcel(new Uint8Array(buffer), skills, candidatePlayers);
      if (!res.success) {
        setError(res.error || "Gagal memproses file Excel");
        setPreviews([]);
      } else {
        setPreviews(res.previews);
        setUnmatchedCount(res.unmatchedCount);
      }
    } catch (err: any) {
      setError(err?.message || "Format file tidak didukung");
    } finally {
      setIsParsing(false);
    }
  };

  const handleManualMatch = (idx: number, playerId: string) => {
    const matchedP = activePlayers.find((p) => p.id === playerId);
    setPreviews((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              matchedPlayerId: playerId,
              matchedPlayerName: matchedP?.name || null,
              isMatched: !!matchedP,
            }
          : r
      )
    );
  };

  const handleImport = () => {
    const validRows = previews.filter((p) => p.matchedPlayerId);
    if (validRows.length === 0) {
      setError("Tidak ada data pemain yang cocok untuk diimpor.");
      toast.error("Tidak ada data pemain yang cocok untuk diimpor.");
      return;
    }

    startTransition(async () => {
      try {
        unwrap(await importRekapDraftsAction({
          sessionId,
          items: validRows.map((r) => ({
            playerId: r.matchedPlayerId!,
            scores: r.scores,
            evaluation: r.evaluation,
            nextPractice: r.nextPractice,
            groupName: r.groupName,
            coachName: r.coachName,
          })),
        }));
        toast.success(`Berhasil mengimpor ${validRows.length} penilaian draft`);
        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.message || "Gagal mengimpor data");
        toast.error(err.message || "Gagal mengimpor data");
      }
    });
  };

  return (
    <Modal title="Upload Rekap Clinic (.xlsx)" onClose={onClose} width={760}>
      <div className="flex flex-col gap-4 text-snow">
        <p className="text-xs text-snow/70">
          Upload file Excel hasil pengisian rekap clinic. Sistem akan mencocokkan nama pemain secara otomatis.
          Nama yang belum cocok dapat Anda pilih secara manual di bawah. Hasil import akan disimpan sebagai <b>Draft</b>.
        </p>

        <div className="bg-[#1F1C2B] rounded-xl p-3.5 border border-snow/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-snow">Belum punya template Excel?</div>
            <div className="text-2xs text-snow/60 mt-0.5">
              Unduh template resmi dengan 39 kolom teknik dan baris contoh untuk diisi oleh Coach.
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="border-0 rounded-lg min-h-9 px-3.5 font-bold text-xs bg-[#FFD43B] text-[#17151F] hover:bg-[#FFD43B]/90 transition-all whitespace-nowrap inline-flex items-center justify-center gap-1.5 flex-none"
          >
            <span>↓</span> Unduh Template (.xlsx)
          </button>
        </div>

        {error && (
          <div className="bg-coral/20 border border-coral text-coral-soft px-3 py-2 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* File input */}
        <div className="flex flex-col gap-2">
          <label className="border-2 border-dashed border-snow/20 hover:border-volt/60 rounded-xl p-6 text-center cursor-pointer transition-all bg-snow/5 flex flex-col items-center justify-center gap-2">
            <span className="text-sm font-semibold text-snow">
              {file ? file.name : "Klik untuk memilih file Excel (.xlsx / .xls)"}
            </span>
            <span className="text-xs text-snow/50">
              Format: Template Rekap Clinic Basecamp Padel
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {isParsing && (
          <div className="text-center py-4 text-xs text-volt animate-pulse">
            Membaca dan memproses lembar kerja Excel...
          </div>
        )}

        {/* Preview table */}
        {previews.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">
                Preview Data ({previews.length} baris ditemukan)
              </span>
              {unmatchedCount > 0 && (
                <span className="text-coral bg-coral/10 px-2 py-0.5 rounded text-3xs font-bold">
                  {unmatchedCount} pemain belum cocok
                </span>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto border border-snow/10 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-ink-2 sticky top-0 border-b border-snow/10 text-snow/70">
                  <tr>
                    <th className="p-2.5">Nama di Excel</th>
                    <th className="p-2.5">Pemain Terdaftar</th>
                    <th className="p-2.5">Grup</th>
                    <th className="p-2.5">Jumlah Nilai</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-snow/5">
                  {previews.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.isMatched ? "hover:bg-snow/5" : "bg-coral/10"}
                    >
                      <td className="p-2.5 font-medium">{row.importedName}</td>
                      <td className="p-2.5">
                        {row.isMatched ? (
                          <span className="text-win-soft font-bold">
                            {row.matchedPlayerName}
                          </span>
                        ) : (
                          <select
                            value={row.matchedPlayerId || ""}
                            onChange={(e) => handleManualMatch(idx, e.target.value)}
                            className="bg-ink-3 border border-coral text-snow rounded px-2 py-1 text-xs w-48"
                          >
                            <option value="">-- Pilih Manual --</option>
                            {activePlayers.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="p-2.5 text-snow/70">{row.groupName || "-"}</td>
                      <td className="p-2.5 font-mono text-snow/80">
                        {Object.keys(row.scores).length} teknik
                      </td>
                      <td className="p-2.5">
                        {row.isMatched ? (
                          <span className="text-win-soft font-bold text-3xs bg-win/20 px-2 py-0.5 rounded-full">
                            Cocok
                          </span>
                        ) : (
                          <span className="text-coral font-bold text-3xs bg-coral/20 px-2 py-0.5 rounded-full">
                            Pilih Manual
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-snow/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-snow/70 hover:text-snow"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isPending || previews.length === 0}
            data-loading={isPending || undefined}
            onClick={handleImport}
            className="bg-volt text-ink font-bold text-xs px-5 py-2.5 rounded-lg hover:bg-volt/90 disabled:opacity-50"
          >
            {isPending ? "Menyimpan Draft..." : "Simpan Sebagai Draft"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
