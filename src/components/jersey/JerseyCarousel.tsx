"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const IMAGES = Array.from({ length: 6 }, (_, i) => `/images/jersey/${i + 1}.jpg`);

export function JerseyCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Native touch swipe already works via overflow-x-auto; this just adds the same drag gesture for
  // a mouse (click-and-drag), which browsers don't give you for free on a plain scroll container.
  const drag = useRef({ down: false, moved: false, startX: 0, startScroll: 0 });

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * i, behavior: "smooth" });
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  };

  // Window-level listeners (not setPointerCapture) so the browser's own click synthesis on the
  // image button is left alone — capturing the pointer on the track suppressed the click entirely.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return; // touch keeps native scrolling/snap/momentum
    const track = trackRef.current;
    if (!track) return;
    drag.current = { down: true, moved: false, startX: e.clientX, startScroll: track.scrollLeft };
    // `scroll-smooth` animates toward whatever we set scrollLeft to — with it on, every pointermove
    // re-targets that animation before it catches up, so the drag barely moves at all. Switch to an
    // instant jump for the duration of the drag; goTo() on release restores the smooth snap.
    track.style.scrollSnapType = "none";
    track.style.scrollBehavior = "auto";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag.current.down) return;
    const track = trackRef.current;
    if (!track) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    track.scrollLeft = drag.current.startScroll - dx;
  };

  const endDrag = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    const track = trackRef.current;
    if (!track || !drag.current.down) return;
    drag.current.down = false;
    track.style.scrollSnapType = "";
    track.style.scrollBehavior = "";
    goTo(Math.round(track.scrollLeft / track.clientWidth));
  };

  const openLightbox = (i: number) => {
    if (drag.current.moved) return; // a drag just ended on this click — don't treat it as a tap
    setLightbox(i);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
    };
  }, []);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") setLightbox((i) => (i !== null ? Math.max(0, i - 1) : i));
      if (e.key === "ArrowRight") setLightbox((i) => (i !== null ? Math.min(IMAGES.length - 1, i + 1) : i));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  return (
    <div className="w-full max-w-[680px] mx-auto px-6 pt-6">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth rounded-card cursor-grab active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {IMAGES.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => openLightbox(i)}
              aria-label={`Perbesar foto ${i + 1}`}
              className="relative shrink-0 w-full aspect-square snap-center border-none bg-transparent p-0"
            >
              <Image src={src} alt={`Jersey Basecamp Padel ${i + 1}`} fill sizes="680px" className="object-cover" priority={i === 0} draggable={false} />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(Math.max(0, active - 1))}
          aria-label="Foto sebelumnya"
          disabled={active === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 btn bg-ink/60 text-snow min-h-9 w-9 px-0 disabled:opacity-0"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => goTo(Math.min(IMAGES.length - 1, active + 1))}
          aria-label="Foto berikutnya"
          disabled={active === IMAGES.length - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 btn bg-ink/60 text-snow min-h-9 w-9 px-0 disabled:opacity-0"
        >
          ›
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 pt-3">
        {IMAGES.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Ke foto ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-coral" : "w-1.5 bg-ink/15"}`}
          />
        ))}
      </div>

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-ink/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Tutup"
            className="absolute z-10 top-4 right-4 btn bg-snow/10 text-snow min-h-10 w-10 px-0"
          >
            ×
          </button>

          {lightbox > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(lightbox - 1);
              }}
              aria-label="Foto sebelumnya"
              className="absolute z-10 left-2 md:left-4 top-1/2 -translate-y-1/2 btn bg-snow/10 text-snow min-h-10 w-10 px-0"
            >
              ‹
            </button>
          )}
          {lightbox < IMAGES.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(lightbox + 1);
              }}
              aria-label="Foto berikutnya"
              className="absolute z-10 right-2 md:right-4 top-1/2 -translate-y-1/2 btn bg-snow/10 text-snow min-h-10 w-10 px-0"
            >
              ›
            </button>
          )}

          <div className="relative w-full h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <Image src={IMAGES[lightbox]} alt={`Jersey Basecamp Padel ${lightbox + 1}`} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
