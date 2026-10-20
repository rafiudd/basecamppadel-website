"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { toast } from "@/components/ui/Toast";

const PRESET_COURT_PHOTOS = [
  { name: "Coach Drill", url: "/images/classes/coach-drill.jpg" },
  { name: "Backglass Shot", url: "/images/classes/backglass-shot.jpg" },
  { name: "Volley Drill", url: "/images/classes/volley-drill.jpg" },
  { name: "Court Cover", url: "/images/cover.jpg" },
  { name: "Court Hero", url: "/images/hero.jpg" },
  { name: "Community", url: "/images/community.webp" },
];

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function ClassMediaUploader({
  initialVideoUrl,
  initialCoverUrl,
  initialGalleryUrls,
}: {
  initialVideoUrl?: string | null;
  initialCoverUrl?: string | null;
  initialGalleryUrls?: string[] | null;
}) {
  const [videoUrl, setVideoUrl] = useState<string>(initialVideoUrl || "");
  const [videoInputMode, setVideoInputMode] = useState<"upload" | "url">("upload");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const initialList = initialGalleryUrls?.length
    ? initialGalleryUrls
    : initialCoverUrl
    ? [initialCoverUrl]
    : [];

  const [galleryUrls, setGalleryUrls] = useState<string[]>(initialList);
  const [coverUrl, setCoverUrl] = useState<string>(initialCoverUrl || initialList[0] || "");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualPhotoUrl, setManualPhotoUrl] = useState("");

  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------- Video Upload & Handlers
  async function handleVideoUpload(file: File) {
    if (!file.type.startsWith("video/")) {
      toast.error("File harus berupa video (MP4, WebM, MOV).");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Ukuran video maksimal 100 MB.");
      return;
    }

    setIsUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mediaType", "video");

      const res = await fetch("/api/admin/kelas/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Gagal mengunggah video.");
      }

      setVideoUrl(data.url);
      toast.success("Video preview berhasil diunggah!");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah video.");
    } finally {
      setIsUploadingVideo(false);
      if (videoFileInputRef.current) videoFileInputRef.current.value = "";
    }
  }

  // ---------------------------------------------------- Photo Upload & Handlers
  async function handlePhotoUpload(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;

    const availableSlots = 6 - galleryUrls.length;
    if (availableSlots <= 0) {
      toast.error("Maksimal 6 foto telah tercapai.");
      return;
    }

    const filesToUpload = fileArray.slice(0, availableSlots);
    setIsUploadingPhoto(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} bukan file gambar.`);
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`${file.name} melebihi batas 15 MB.`);
          continue;
        }

        const fd = new FormData();
        fd.append("file", file);
        fd.append("mediaType", "image");

        const res = await fetch("/api/admin/kelas/upload", {
          method: "POST",
          body: fd,
        });

        const data = await res.json();
        if (res.ok && data.url) {
          uploadedUrls.push(data.url);
        } else {
          toast.error(data.error || `Gagal mengunggah ${file.name}`);
        }
      }

      if (uploadedUrls.length > 0) {
        setGalleryUrls((prev) => {
          const next = [...prev, ...uploadedUrls];
          if (!coverUrl && next.length > 0) {
            setCoverUrl(next[0]);
          }
          return next;
        });
        toast.success(`Berhasil mengunggah ${uploadedUrls.length} foto!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah foto.");
    } finally {
      setIsUploadingPhoto(false);
      if (photoFileInputRef.current) photoFileInputRef.current.value = "";
    }
  }

  function addPresetPhoto(url: string) {
    if (galleryUrls.includes(url)) {
      toast.error("Foto ini sudah ada di galeri.");
      return;
    }
    if (galleryUrls.length >= 6) {
      toast.error("Maksimal 6 foto tercapai.");
      return;
    }
    setGalleryUrls((prev) => {
      const next = [...prev, url];
      if (!coverUrl) setCoverUrl(next[0]);
      return next;
    });
    toast.success("Foto preset ditambahkan.");
  }

  function addManualUrl() {
    const trimmed = manualPhotoUrl.trim();
    if (!trimmed) return;
    if (galleryUrls.includes(trimmed)) {
      toast.error("Foto ini sudah ada di galeri.");
      return;
    }
    if (galleryUrls.length >= 6) {
      toast.error("Maksimal 6 foto tercapai.");
      return;
    }
    setGalleryUrls((prev) => {
      const next = [...prev, trimmed];
      if (!coverUrl) setCoverUrl(next[0]);
      return next;
    });
    setManualPhotoUrl("");
    setShowUrlInput(false);
    toast.success("Foto ditambahkan.");
  }

  function removePhoto(idx: number) {
    const targetUrl = galleryUrls[idx];
    const nextGallery = galleryUrls.filter((_, i) => i !== idx);
    setGalleryUrls(nextGallery);

    if (coverUrl === targetUrl) {
      setCoverUrl(nextGallery[0] || "");
    }
  }

  function handleSetCover(url: string) {
    setCoverUrl(url);
    toast.success("Foto cover kelas diperbarui.");
  }

  const ytId = getYouTubeId(videoUrl);

  return (
    <section className="bg-[#221F30] rounded-2xl p-5 md:p-6 flex flex-col gap-5 border border-snow/5">
      {/* Hidden inputs submitted in the parent form */}
      <input type="hidden" name="video_url" value={videoUrl} />
      <input type="hidden" name="cover_image_url" value={coverUrl} />
      {galleryUrls.map((url, i) => (
        <input key={`${url}-${i}`} type="hidden" name="gallery_urls" value={url} />
      ))}

      {/* Header Section */}
      <div className="flex gap-3 items-center">
        <span className="w-7 h-7 rounded-full bg-[#1B1650] text-volt flex items-center justify-center font-display font-bold text-sm shrink-0">
          2
        </span>
        <div>
          <h2 className="font-display font-bold text-lg text-snow m-0">Foto & video</h2>
          <p className="text-xs text-snow/70 m-0">Cover muncul di kartu kelas. Video preview diputar di halaman detail.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ========================================================= */}
        {/* KOLOM KIRI: VIDEO PREVIEW */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-snow/75">
              Video Preview
            </span>
            {videoUrl && (
              <button
                type="button"
                onClick={() => setVideoUrl("")}
                className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
              >
                Hapus video
              </button>
            )}
          </div>

          {/* Jika video sudah ada, tampilkan preview */}
          {videoUrl ? (
            <div className="flex flex-col gap-2">
              <div className="relative w-full h-44 rounded-xl overflow-hidden bg-black/80 border border-snow/10 flex items-center justify-center">
                {ytId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                    title="YouTube video player"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-xs bg-snow/5 px-3 py-2 rounded-lg border border-snow/10">
                <span className="truncate max-w-[240px] text-snow/70">{videoUrl}</span>
                <button
                  type="button"
                  onClick={() => {
                    setVideoUrl("");
                    setVideoInputMode("upload");
                  }}
                  className="text-volt hover:underline font-semibold shrink-0 ml-2"
                >
                  Ganti
                </button>
              </div>
            </div>
          ) : (
            /* Jika belum ada video, tampilkan opsi Upload atau Tautan */
            <div className="flex flex-col gap-3">
              {/* Mode switch pills */}
              <div className="flex gap-1.5 p-1 bg-snow/5 rounded-lg border border-snow/10 text-xs">
                <button
                  type="button"
                  onClick={() => setVideoInputMode("upload")}
                  className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-all ${
                    videoInputMode === "upload"
                      ? "bg-volt text-ink font-bold shadow-sm"
                      : "text-snow/70 hover:text-snow"
                  }`}
                >
                  Upload File Video
                </button>
                <button
                  type="button"
                  onClick={() => setVideoInputMode("url")}
                  className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-all ${
                    videoInputMode === "url"
                      ? "bg-volt text-ink font-bold shadow-sm"
                      : "text-snow/70 hover:text-snow"
                  }`}
                >
                  Tautan YouTube / MP4
                </button>
              </div>

              {videoInputMode === "upload" ? (
                /* Upload Drag & Drop Box */
                <div>
                  <input
                    ref={videoFileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleVideoUpload(file);
                    }}
                  />
                  <div
                    onClick={() => !isUploadingVideo && videoFileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleVideoUpload(file);
                    }}
                    className={`min-h-[140px] border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isUploadingVideo
                        ? "border-volt/50 bg-volt/5 pointer-events-none"
                        : "border-snow/20 hover:border-volt/60 bg-snow/[0.02] hover:bg-snow/[0.04]"
                    }`}
                  >
                    {isUploadingVideo ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-7 h-7 border-2 border-volt border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold text-volt">Mengunggah video ke cloud...</span>
                        <span className="text-[11px] text-snow/50">Mohon tunggu beberapa saat</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-snow/5 flex items-center justify-center mb-2 text-volt text-lg">
                          📹
                        </div>
                        <span className="text-sm font-bold text-snow">+ Upload video</span>
                        <span className="text-xs text-snow/60 mt-0.5">MP4, WebM atau MOV (maks. 100 MB)</span>
                        <span className="text-[11px] text-snow/40 mt-1">Video pendek 1–2 menit demonstrasi drill</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* Input Link URL */
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="flex-1 bg-snow/10 border border-snow/10 rounded-lg px-3 py-2.5 text-sm text-snow placeholder:text-snow/30 outline-none focus:ring-1 focus:ring-volt"
                    />
                  </div>
                  <span className="text-[11px] text-snow/55">
                    Tempelkan link YouTube, YouTube Shorts, atau URL file MP4 langsung.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* KOLOM KANAN: FOTO COVER & GALERI */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-snow/75">
              Foto Cover & Galeri ({galleryUrls.length}/6)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPresetPicker((v) => !v)}
                className="text-[11px] text-volt hover:underline transition-colors"
              >
                {showPresetPicker ? "Tutup preset" : "+ Preset foto"}
              </button>
              <span className="text-snow/30">·</span>
              <button
                type="button"
                onClick={() => setShowUrlInput((v) => !v)}
                className="text-[11px] text-snow/70 hover:text-snow transition-colors"
              >
                + URL
              </button>
            </div>
          </div>

          {/* Quick Preset Selector */}
          {showPresetPicker && (
            <div className="bg-snow/5 p-3 rounded-xl border border-snow/10 flex flex-col gap-2 animate-fade-in">
              <span className="text-xs font-bold text-snow">Pilih foto lapangan Basecamp Padel:</span>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_COURT_PHOTOS.map((p) => {
                  const isAdded = galleryUrls.includes(p.url);
                  return (
                    <button
                      key={p.url}
                      type="button"
                      disabled={isAdded || galleryUrls.length >= 6}
                      onClick={() => addPresetPhoto(p.url)}
                      className={`relative aspect-video rounded-lg overflow-hidden border text-left group transition-all ${
                        isAdded
                          ? "border-volt opacity-50 cursor-not-allowed"
                          : "border-snow/15 hover:border-volt hover:scale-105"
                      }`}
                    >
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 p-1 flex items-end">
                        <span className="text-[10px] text-snow font-medium leading-tight truncate">
                          {isAdded ? "✓ " : "+ "}
                          {p.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Manual URL Input */}
          {showUrlInput && (
            <div className="bg-snow/5 p-3 rounded-xl border border-snow/10 flex gap-2 animate-fade-in">
              <input
                type="url"
                placeholder="https://domain.com/foto.jpg"
                value={manualPhotoUrl}
                onChange={(e) => setManualPhotoUrl(e.target.value)}
                className="flex-1 bg-snow/10 border border-snow/10 rounded-lg px-2.5 py-1.5 text-xs text-snow outline-none focus:ring-1 focus:ring-volt"
              />
              <button
                type="button"
                onClick={addManualUrl}
                className="bg-volt text-ink font-bold text-xs px-3 py-1.5 rounded-lg hover:brightness-110"
              >
                Tambah
              </button>
            </div>
          )}

          {/* Hidden File Input for Photos */}
          <input
            ref={photoFileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handlePhotoUpload(e.target.files);
            }}
          />

          {/* Photo Gallery Grid */}
          {galleryUrls.length > 0 ? (
            <div className="grid grid-cols-3 gap-2.5">
              {galleryUrls.map((url, idx) => {
                const isCover = coverUrl === url || (!coverUrl && idx === 0);
                return (
                  <div
                    key={`${url}-${idx}`}
                    className={`relative aspect-video rounded-xl overflow-hidden border group bg-black/30 transition-all ${
                      isCover ? "border-volt ring-2 ring-volt/40 shadow-lg" : "border-snow/15"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Foto galeri ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Cover Badge */}
                    {isCover && (
                      <span className="absolute top-1.5 left-1.5 bg-volt text-ink font-bold text-[10px] px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 pointer-events-none">
                        ★ COVER
                      </span>
                    )}

                    {/* Hover Actions Bar */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          title="Hapus foto ini"
                          className="w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-xs shadow"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex justify-center">
                        {!isCover ? (
                          <button
                            type="button"
                            onClick={() => handleSetCover(url)}
                            className="bg-volt text-ink font-bold text-[10px] px-2 py-1 rounded shadow hover:brightness-110 transition-all"
                          >
                            Set sbg Cover
                          </button>
                        ) : (
                          <span className="text-[10px] text-volt font-bold">Cover utama</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Slot Tambah Foto jika belum 6 foto */}
              {galleryUrls.length < 6 && (
                <div
                  onClick={() => !isUploadingPhoto && photoFileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) handlePhotoUpload(e.dataTransfer.files);
                  }}
                  className={`aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isUploadingPhoto
                      ? "border-volt/50 bg-volt/5 pointer-events-none"
                      : "border-snow/20 hover:border-volt/60 bg-snow/[0.02] hover:bg-snow/[0.05]"
                  }`}
                >
                  {isUploadingPhoto ? (
                    <div className="w-5 h-5 border-2 border-volt border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-volt text-base font-bold leading-none mb-1">+</span>
                      <span className="text-[11px] font-bold text-snow">Upload</span>
                      <span className="text-[9px] text-snow/50">Maks {6 - galleryUrls.length} lagi</span>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Tampilan jika belum ada foto sama sekali */
            <div
              onClick={() => !isUploadingPhoto && photoFileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) handlePhotoUpload(e.dataTransfer.files);
              }}
              className={`min-h-[140px] border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isUploadingPhoto
                  ? "border-volt/50 bg-volt/5 pointer-events-none"
                  : "border-snow/20 hover:border-volt/60 bg-snow/[0.02] hover:bg-snow/[0.04]"
              }`}
            >
              {isUploadingPhoto ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-7 h-7 border-2 border-volt border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-volt">Mengunggah foto...</span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-snow/5 flex items-center justify-center mb-2 text-volt text-lg">
                    🖼️
                  </div>
                  <span className="text-sm font-bold text-snow">+ Upload foto</span>
                  <span className="text-xs text-snow/60 mt-0.5">JPG, PNG atau WebP (hingga 6 foto)</span>
                  <span className="text-[11px] text-snow/40 mt-1">
                    Foto pertama otomatis jadi cover kartu kelas
                  </span>
                </>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-snow/50 px-1 mt-0.5">
            <span>Foto pertama otomatis menjadi Cover kartu kelas.</span>
            <span>Maks 15 MB / file</span>
          </div>
        </div>
      </div>
    </section>
  );
}
