"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  formatRupiah,
  PIN_COLORS,
  calculateRatingSummary,
  generateWhatsAppBookingUrl,
  formatReviewDate,
  formatRelativeTime,
} from "@/lib/kelasRules";
import { postClassComment } from "@/app/kelas/actions";
import { useAccountChip } from "@/components/account/useAccountChip";
import { Avatar } from "@/components/ui/Avatar";

export function ClassDetailClient({ classData }: { classData: any }) {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    classData.schedules[0]?.id || ""
  );

  const defaultGallery = [
    "/images/classes/coach-drill.jpg",
    "/images/classes/backglass-shot.jpg",
    "/images/classes/volley-drill.jpg",
  ];
  const galleryPhotos: string[] =
    classData.galleryUrls && classData.galleryUrls.length > 0
      ? classData.galleryUrls
      : defaultGallery;

  const [activeMedia, setActiveMedia] = useState<number | "video">(
    classData.videoUrl ? "video" : 0
  );
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const pathname = usePathname();
  const account = useAccountChip();

  const [commentText, setCommentText] = useState("");
  const [commentSent, setCommentSent] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev === 0 ? galleryPhotos.length - 1 : prev - 1));
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev === galleryPhotos.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, galleryPhotos.length]);

  const ratingSummary = calculateRatingSummary(classData.reviews);

  const activeSchedule =
    classData.schedules.find((s: any) => s.id === selectedScheduleId) ||
    classData.schedules[0];


  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    setCommentError(null);

    const fd = new FormData();
    fd.set("class_id", classData.id);
    if (account?.name) {
      fd.set("author_name", account.name);
    }
    fd.set("comment", commentText.trim());
    fd.set("slug", classData.slug);

    try {
      const res = await postClassComment(null, fd);
      if (res?.error) {
        setCommentError(res.error);
      } else {
        setCommentSent(true);
        setCommentText("");
      }
    } catch (err: any) {
      setCommentError(err.message || "Gagal mengirim pertanyaan. Silakan coba lagi.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero Header */}
      <section className="bg-indigo text-snow px-6 md:px-12 py-10 md:py-14 relative overflow-hidden">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col md:flex-row gap-8 lg:gap-12 items-center">
          <div className="flex-1 flex flex-col gap-4">
            <Link
              href="/kelas"
              className="text-xs md:text-sm font-semibold text-snow/75 hover:text-volt no-underline self-start"
            >
              ← Semua kelas
            </Link>

            {/* Pin Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-snow/15 text-xs font-bold text-snow">
                <span className="flex items-center gap-1">
                  {classData.suitablePins.map((pin: string) => (
                    <span
                      key={pin}
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{
                        background: PIN_COLORS[pin]?.bg || "#FFF",
                        border: PIN_COLORS[pin]?.border || "none",
                      }}
                    />
                  ))}
                </span>
                Cocok untuk pin {classData.suitablePins.join(" & ")}
              </span>
            </div>

            <h1 className="font-display font-bold text-3xl md:text-5xl text-snow m-0 leading-tight">
              {classData.title}
            </h1>

            <p className="text-sm md:text-base text-snow/80 m-0 leading-relaxed max-w-xl">
              {classData.description}
            </p>

            <div className="flex items-center gap-4 text-xs md:text-sm text-snow/90 pt-1 flex-wrap">
              <span className="flex items-center gap-1 font-bold text-snow">
                <span className="text-amber-400">★</span> {classData.averageRating}
                <span className="font-normal text-snow/70">({classData.totalReviews} ulasan)</span>
              </span>
              <span>·</span>
              <span>
                <b className="text-volt">{classData.totalParticipants} orang</b> udah ikut kelas ini
              </span>
            </div>

            {/* Spec summary pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-snow/10">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-snow/60 block">Durasi</span>
                <span className="font-bold text-sm text-snow block mt-0.5">
                  {classData.totalSessions} sesi × {classData.durationPerSession} menit
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-snow/60 block">Peserta</span>
                <span className="font-bold text-sm text-snow block mt-0.5">
                  Maks {classData.capacity} orang
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-snow/60 block">Coach</span>
                <span className="font-bold text-sm text-snow block mt-0.5">
                  {classData.coachName ? `Coach ${classData.coachName}` : "Pilih coach"}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-snow/60 block">Venue</span>
                <span className="font-bold text-sm text-snow block mt-0.5">
                  {classData.schedules[0]?.venueName || "East Padel House"}
                </span>
              </div>
            </div>
          </div>

          {/* Media Player & Gallery Box */}
          <div className="w-full md:w-96 lg:w-[460px] flex-none flex flex-col gap-3">
            <div className="relative aspect-video rounded-2xl bg-[#0F0D17] overflow-hidden shadow-2xl flex items-center justify-center border border-white/10 group">
              {activeMedia === "video" ? (
                isPlayingVideo ? (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <iframe
                      className="w-full h-full"
                      src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1"
                      title="Video Preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="w-full h-full relative">
                    <img
                      src={classData.coverImageUrl || galleryPhotos[0]}
                      alt={classData.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-ink/40" />
                    <button
                      type="button"
                      onClick={() => setIsPlayingVideo(true)}
                      className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group/btn border-0 bg-transparent"
                    >
                      <span className="w-16 h-16 rounded-full bg-coral flex items-center justify-center shadow-2xl group-hover/btn:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-ink ml-1" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="7,4 20,12 7,20" />
                        </svg>
                      </span>
                      <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 bg-white/95 text-ink text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        Video preview kelas
                      </span>
                      <span className="absolute right-3 bottom-3 bg-ink/80 text-snow text-xs font-bold px-2 py-0.5 rounded">
                        1:20
                      </span>
                    </button>
                  </div>
                )
              ) : (
                <div
                  className="w-full h-full relative cursor-zoom-in"
                  onClick={() => {
                    setLightboxIndex(activeMedia as number);
                    setIsLightboxOpen(true);
                  }}
                >
                  <img
                    src={galleryPhotos[activeMedia as number]}
                    alt={`${classData.title} - Foto ${(activeMedia as number) + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 bg-white/95 text-ink text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    Foto {(activeMedia as number) + 1} dari {galleryPhotos.length}
                  </span>
                  <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 bg-ink/80 hover:bg-ink text-snow text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="11" cy="11" r="7" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    Klik perbesar
                  </span>
                </div>
              )}
            </div>

            {/* Media Thumbnails Switcher */}
            <div className="grid grid-cols-4 gap-2">
              {/* Video Tab Thumbnail */}
              <button
                type="button"
                onClick={() => {
                  setActiveMedia("video");
                  setIsPlayingVideo(false);
                }}
                className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer p-0 bg-ink ${
                  activeMedia === "video"
                    ? "border-volt ring-2 ring-volt/40 scale-[1.02] shadow-md"
                    : "border-white/20 opacity-75 hover:opacity-100 hover:border-white/50"
                }`}
              >
                <img
                  src={classData.coverImageUrl || galleryPhotos[0]}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-ink/50 flex items-center justify-center">
                  <span className="w-7 h-7 rounded-full bg-coral flex items-center justify-center shadow">
                    <svg className="w-3.5 h-3.5 text-ink ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="7,4 20,12 7,20" />
                    </svg>
                  </span>
                </div>
                <span className="absolute bottom-1 left-1.5 right-1.5 text-[10px] font-bold text-snow truncate bg-black/60 px-1 rounded text-center">
                  Video
                </span>
              </button>

              {/* Photo Thumbnails */}
              {galleryPhotos.map((url: string, idx: number) => {
                const isActive = activeMedia === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveMedia(idx);
                      setIsPlayingVideo(false);
                    }}
                    className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer p-0 bg-ink/30 ${
                      isActive
                        ? "border-volt ring-2 ring-volt/40 scale-[1.02] shadow-md"
                        : "border-white/20 opacity-75 hover:opacity-100 hover:border-white/50"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1.5 right-1.5 text-[10px] font-bold text-snow bg-black/60 px-1 rounded text-center truncate">
                      Foto {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Sticky Booking */}
      <section className="px-6 md:px-12 py-8 md:py-12 bg-snow">
        <div className="w-full max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 Cols): Syllabus & Content */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Yang Kamu Pelajari */}
            <section className="bg-white border border-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-4 shadow-sm">
              <h2 className="font-display font-bold text-xl md:text-2xl text-ink m-0">
                Yang kamu pelajari
              </h2>
              <div className="flex flex-col gap-3">
                {classData.learningPoints.map((point: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-emerald-600 flex-none mt-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-sm md:text-base text-ink leading-relaxed">
                      {point}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Coach Kamu */}
            <section className="bg-white border border-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-4 shadow-sm">
              <h2 className="font-display font-bold text-xl md:text-2xl text-ink m-0">
                Coach kamu
              </h2>
              <div className="flex items-center gap-4">
                <span className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-[#1B1650] text-snow font-display font-bold text-2xl flex items-center justify-center shadow">
                  {classData.coachName ? classData.coachName.charAt(0) : "C"}
                </span>
                <div>
                  <h3 className="font-display font-bold text-lg text-ink m-0">
                    {classData.coachName ? `Coach ${classData.coachName}` : "Head Coach"}
                  </h3>
                  <p className="text-xs md:text-sm text-ink/70 m-0 mt-1">
                    Pelatih tersertifikasi dengan pengalaman membina pemain dari level dasar hingga kompetisi turnamen.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap text-xs font-semibold pt-1">
                <span className="px-3 py-1 rounded-full bg-ink/5 text-ink">
                  Spesialis teknik & defense
                </span>
                <span className="px-3 py-1 rounded-full bg-ink/5 text-ink">
                  Bahasa: Indonesia
                </span>
              </div>
            </section>

            {/* Isi Tiap Sesi */}
            <section className="bg-white border border-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-4 shadow-sm">
              <h2 className="font-display font-bold text-xl md:text-2xl text-ink m-0">
                Isi tiap sesi
              </h2>
              <div className="flex flex-col divide-y divide-ink/10">
                {classData.sessionsBreakdown.map((sb: any) => (
                  <div key={sb.session} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                    <span className="w-16 flex-none font-display font-bold text-sm text-[#1B1650]">
                      Sesi {sb.session}
                    </span>
                    <div className="flex flex-col gap-1">
                      <h4 className="font-bold text-sm md:text-base text-ink m-0">
                        {sb.title}
                      </h4>
                      <p className="text-xs md:text-sm text-ink/70 m-0 leading-relaxed">
                        {sb.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Yang Perlu Dibawa */}
            <section className="bg-white border border-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-4 shadow-sm">
              <h2 className="font-display font-bold text-xl md:text-2xl text-ink m-0">
                Yang perlu dibawa
              </h2>
              <div className="flex flex-col gap-2.5 pl-6 text-xs md:text-sm text-ink/85 leading-relaxed">
                {classData.requirements.map((req: string, idx: number) => (
                  <div key={idx}>{req}</div>
                ))}
              </div>
            </section>

            {/* Ulasan Peserta */}
            <section className="bg-white border border-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-5 shadow-sm">
              <div className="flex justify-between items-baseline flex-wrap gap-2">
                <h2 className="font-display font-bold text-xl md:text-2xl text-ink m-0">
                  Ulasan peserta
                </h2>
                <span className="text-xs text-ink/60">
                  Cuma peserta yang udah ikut kelas bisa kasih ulasan
                </span>
              </div>

              {/* Rating summary & histogram */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10 pb-4 border-b border-ink/10">
                <div className="flex flex-col gap-1">
                  <div className="font-display font-bold text-4xl md:text-5xl text-ink leading-none">
                    {classData.averageRating}
                  </div>
                  <div className="text-amber-500 text-sm">★★★★★</div>
                  <div className="text-xs text-ink/60 mt-1">
                    {classData.totalReviews} ulasan · {classData.totalParticipants} alumni
                  </div>
                </div>

                <div className="flex-1 w-full flex flex-col gap-1.5 text-xs text-ink/65">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-2.5">
                      <span className="w-3 text-right">{star}</span>
                      <div className="flex-1 h-2 rounded-full bg-ink/10 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${ratingSummary.percentages[star] || 0}%` }}
                        />
                      </div>
                      <span className="w-6 text-right font-medium">
                        {ratingSummary.counts[star] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews List */}
              <div className="flex flex-col divide-y divide-ink/10">
                {classData.reviews.map((r: any) => {
                  const pinBg =
                    r.pinColor && PIN_COLORS[r.pinColor]?.bg
                      ? PIN_COLORS[r.pinColor].bg
                      : "#FFD43B";

                  return (
                    <div key={r.id} className="py-5 flex flex-col gap-2.5">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-[#ECEAF7] text-[#1B1650] font-bold text-sm flex items-center justify-center flex-none">
                            {r.authorName.charAt(0)}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <b className="text-sm text-ink font-bold">{r.authorName}</b>
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block flex-none"
                                style={{ background: pinBg }}
                              />
                            </div>
                            <span className="text-xs text-ink/50">
                              {formatReviewDate(r.createdAt)} · ikut jadwal {r.scheduleLabel || "Sabtu pagi"}
                            </span>
                          </div>
                        </div>
                        <span className="text-amber-400 text-sm tracking-widest flex-none">
                          {"★".repeat(r.rating)}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-ink/85 m-0 leading-relaxed">
                        {r.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Tanya & Komentar */}
            <section className="bg-white border border-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-5 shadow-sm">
              <div className="flex justify-between items-baseline">
                <h2 className="font-display font-bold text-xl md:text-2xl text-ink m-0">
                  Tanya & komentar
                </h2>
                <span className="text-xs text-ink/60">{classData.comments.length} komentar</span>
              </div>

              {/* Submit comment form / Login required notice */}
              {account === undefined ? (
                <div className="h-28 bg-ink/[0.02] border border-ink/10 rounded-xl animate-pulse" />
              ) : account === null ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-ink/[0.02] p-5 rounded-xl border border-ink/10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-coral/10 text-coral flex items-center justify-center font-bold text-lg flex-none">
                      💬
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-xs sm:text-sm text-ink">
                        Punya pertanyaan seputar kelas ini?
                      </span>
                      <span className="text-xs text-ink/65">
                        Silakan masuk terlebih dahulu untuk mengirim pertanyaan atau diskusi dengan coach.
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/masuk?next=${encodeURIComponent(pathname || `/kelas/${classData.slug}`)}`}
                    className="btn btn-coral px-5 py-2.5 rounded-full text-xs font-bold text-ink whitespace-nowrap self-stretch sm:self-auto text-center tracking-button"
                  >
                    Masuk untuk Bertanya
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleComment} className="flex flex-col gap-3 bg-ink/[0.02] p-4 rounded-xl border border-ink/10">
                  {commentSent ? (
                    <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
                      <span>✓ Pertanyaan kamu sudah terkirim! Coach kami akan segera membalas di sini.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCommentSent(false);
                          setCommentError(null);
                        }}
                        className="text-[11px] underline font-semibold text-emerald-800 hover:text-emerald-950 ml-2 cursor-pointer"
                      >
                        Tulis lagi
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 pb-2 border-b border-ink/5">
                        <Avatar name={account.name} photoUrl={account.photoUrl} size={28} />
                        <span className="text-xs text-ink/70">
                          Bertanya sebagai <b className="text-ink font-semibold">{account.name}</b>
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Tulis pertanyaan atau komentar seputar kelas ini..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="bg-white border border-ink/15 rounded-lg px-3 py-2 text-xs text-ink outline-none resize-y focus:border-indigo"
                      />
                      {commentError && (
                        <div className="text-xs text-loss bg-loss/10 rounded-lg px-3 py-2 font-medium">
                          {commentError}
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !commentText.trim()}
                        className="btn btn-coral px-4 py-2 rounded-full text-xs font-bold text-ink self-end tracking-button disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSubmittingComment ? "Mengirim..." : "Kirim pertanyaan"}
                      </button>
                    </>
                  )}
                </form>
              )}

              {/* Comments Thread */}
              <div className="flex flex-col divide-y divide-ink/10">
                {classData.comments.map((cm: any) => (
                  <div key={cm.id} className="py-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-full bg-ink/10 text-ink font-bold text-xs flex items-center justify-center flex-none">
                        {cm.authorName.charAt(0)}
                      </span>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <b className="text-xs text-ink font-semibold">{cm.authorName}</b>
                          <span className="text-[11px] text-ink/45">
                            {formatRelativeTime(cm.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-ink/85 m-0 leading-relaxed">
                          {cm.comment}
                        </p>
                      </div>
                    </div>

                    {/* Replies */}
                    {cm.replies.map((rp: any) => (
                      <div
                        key={rp.id}
                        className="ml-10 p-3 rounded-xl bg-ink/5 border-l-2 border-[#1B1650] flex gap-2.5 items-start"
                      >
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600 to-[#1B1650] text-snow text-[10px] font-bold flex items-center justify-center flex-none">
                          L
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-xs">
                            <b className="text-ink font-semibold">{rp.authorName}</b>
                            {rp.isCoachReply && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#1B1650] text-volt">
                                Coach
                              </span>
                            )}
                            <span className="text-[11px] text-ink/45">
                              {formatRelativeTime(rp.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-ink/80 m-0 leading-relaxed">{rp.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column (4 Cols): Sticky Booking Card */}
          <aside className="lg:col-span-4 lg:sticky lg:top-[104px] flex flex-col gap-4">
            <div className="bg-white border border-ink/10 rounded-2xl p-6 flex flex-col gap-5 shadow-lg">
              <div className="flex justify-between items-baseline gap-2">
                <h3 className="font-display font-bold text-xl text-ink m-0">Daftar kelas</h3>
                <span className="font-display font-bold text-2xl text-[#1B1650]">
                  {formatRupiah(classData.price)}
                </span>
              </div>

              <div className="text-xs text-ink/65 -mt-2">
                {classData.totalParticipants} orang udah ikut · per orang · {classData.totalSessions} sesi × {classData.durationPerSession} menit
              </div>

              {/* Schedule Radio Selection */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold tracking-wider uppercase text-ink/60">
                  Pilih jadwal
                </span>

                {classData.schedules.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-ink/5 border border-dashed border-ink/15 text-xs text-ink/70 text-center leading-relaxed">
                    Jadwal batch baru akan segera dibuka. Chat kami di WhatsApp untuk request jadwal atau private session.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {classData.schedules.map((s: any) => {
                      const isSelected = s.id === selectedScheduleId;
                      const isFull = s.status === "full";
                      const rem = Math.max(0, s.capacity - s.registeredCount);

                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isFull
                              ? "opacity-60 bg-ink/5 border-ink/10 cursor-not-allowed"
                              : isSelected
                              ? "border-[#1B1650] bg-[#1B1650]/5 shadow-sm"
                              : "border-ink/15 hover:border-ink/30 bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name="slot"
                            disabled={isFull}
                            checked={isSelected}
                            onChange={() => setSelectedScheduleId(s.id)}
                            className="w-4 h-4 accent-[#1B1650]"
                          />
                          <div className="flex-1">
                            <div className="font-bold text-sm text-ink">{s.datesLabel}</div>
                            <div className="text-xs text-ink/65 mt-0.5">{s.timeRange}</div>
                          </div>
                          <span
                            className={`text-xs font-bold whitespace-nowrap ${
                              isFull ? "text-ink/40" : rem <= 2 ? "text-coral" : "text-emerald-700"
                            }`}
                          >
                            {isFull ? "Penuh" : `${rem} slot tersisa`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Direct WhatsApp CTA Button */}
              <div className="flex flex-col gap-2.5">
                <a
                  href={generateWhatsAppBookingUrl(
                    "628123456789",
                    classData.title,
                    activeSchedule?.datesLabel
                  )}
                  target="_blank"
                  rel="noopener"
                  className="bg-coral text-ink py-3.5 rounded-full font-bold text-sm tracking-button shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform text-center no-underline cursor-pointer block"
                >
                  Daftar &amp; bayar
                </a>

                <a
                  href={generateWhatsAppBookingUrl(
                    "628123456789",
                    classData.title
                  )}
                  target="_blank"
                  rel="noopener"
                  className="text-center text-xs font-bold text-[#1B1650] hover:underline py-1 no-underline"
                >
                  Tanya dulu via WhatsApp
                </a>
              </div>

              <div className="text-[11px] text-ink/60 leading-normal border-t border-ink/10 pt-3">
                Kelas jalan minimal 2 peserta. Kalau kurang, kamu bisa pindah jadwal atau refund penuh.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>

    {/* Lightbox Modal */}
    {isLightboxOpen && (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md"
        onClick={() => setIsLightboxOpen(false)}
      >
        {/* Top Bar with counter & close button */}
        <div
          className="w-full max-w-5xl flex items-center justify-between text-snow pb-3 px-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-sans font-bold text-sm text-snow/80">
            Foto {lightboxIndex + 1} dari {galleryPhotos.length} · {classData.title}
          </span>
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-snow flex items-center justify-center cursor-pointer transition-colors border-0 text-xl font-bold"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Main Full Photo View with Prev/Next Controls */}
        <div
          className="relative w-full max-w-5xl aspect-video max-h-[75vh] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={galleryPhotos[lightboxIndex]}
            alt={`Foto ${lightboxIndex + 1}`}
            className="w-full h-full object-contain rounded-xl select-none"
          />

          {/* Navigation buttons */}
          {galleryPhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev === 0 ? galleryPhotos.length - 1 : prev - 1
                  )
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-snow flex items-center justify-center cursor-pointer transition-transform hover:scale-105 border border-white/20 text-lg font-bold"
                aria-label="Foto sebelumnya"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev === galleryPhotos.length - 1 ? 0 : prev + 1
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-snow flex items-center justify-center cursor-pointer transition-transform hover:scale-105 border border-white/20 text-lg font-bold"
                aria-label="Foto selanjutnya"
              >
                →
              </button>
            </>
          )}
        </div>

        {/* Bottom Thumbnails Strip */}
        <div
          className="flex items-center gap-3 pt-4 overflow-x-auto max-w-full px-4"
          onClick={(e) => e.stopPropagation()}
        >
          {galleryPhotos.map((url: string, idx: number) => (
            <button
              key={idx}
              type="button"
              onClick={() => setLightboxIndex(idx)}
              className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all p-0 cursor-pointer ${
                lightboxIndex === idx
                  ? "border-volt scale-110 shadow-lg ring-2 ring-volt/40"
                  : "border-white/30 opacity-60 hover:opacity-100"
              }`}
            >
              <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
  );
}
