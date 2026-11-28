"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ArtImage } from "@/components/art-image";
import type { Artwork } from "@/lib/catalog";

type GalleryWork = Pick<Artwork, "id" | "title" | "artist" | "image" | "colors" | "description">;

function galleryAnimation(track: HTMLDivElement | null) {
  return track?.getAnimations().find(
    (animation) => "animationName" in animation && animation.animationName === "gallery-belt",
  );
}

export function LandingGallery({ works }: { works: GalleryWork[] }) {
  const [position, setPosition] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [captionOffset, setCaptionOffset] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const detailLink = useRef<HTMLAnchorElement>(null);
  const dragStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const previousPositions = useRef(new Map<string, DOMRect>());
  const active = selected ?? position;
  const workInCenter = works[selected ?? (position + captionOffset) % works.length];
  const offsets = selected === null ? works.map((_, index) => index) : [-2, -1, 0, 1, 2];

  function browseCenter() {
    const progress = track.current
      ? Number(getComputedStyle(track.current).getPropertyValue("--gallery-progress"))
      : 0;
    return (position + Math.round(progress)) % works.length;
  }

  const capturePositions = useCallback(() => {
    previousPositions.current.clear();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    track.current?.querySelectorAll<HTMLButtonElement>("[data-work]").forEach((card) => {
      if (card.offsetWidth) previousPositions.current.set(card.dataset.work!, card.getBoundingClientRect());
    });
  }, []);

  useEffect(() => {
    if (selected === null) return;

    function dismissOnClick(event: MouseEvent) {
      if (event.target instanceof Node && detailLink.current?.contains(event.target)) return;
      capturePositions();
      setSelected(null);
    }

    document.addEventListener("click", dismissOnClick, true);
    return () => document.removeEventListener("click", dismissOnClick, true);
  }, [capturePositions, selected]);

  useEffect(() => {
    if (selected !== null) return;
    let animation = galleryAnimation(track.current);
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (!animation || animation.playState === "idle") animation = galleryAnimation(track.current);
      const progress = animation?.effect?.getComputedTiming().progress ?? 0;
      setCaptionOffset(Math.round(progress * works.length) % works.length);
    }, 100);
    return () => window.clearInterval(timer);
  }, [selected, works.length]);

  useLayoutEffect(() => {
    if (previousPositions.current.size) {
      const animation = galleryAnimation(track.current);
      if (animation) animation.currentTime = 0;
    }
    track.current?.querySelectorAll<HTMLButtonElement>("[data-work]").forEach((card) => {
      const previous = previousPositions.current.get(card.dataset.work!);
      card.getAnimations().forEach((animation) => {
        if (animation.id === "gallery-slide") animation.cancel();
      });
      if (!previous || !card.offsetWidth) return;
      const next = card.getBoundingClientRect();
      const x = previous.x + previous.width / 2 - next.x - next.width / 2;
      const y = previous.y + previous.height / 2 - next.y - next.height / 2;
      if (Math.abs(x) + Math.abs(y) < 1) return;
      card.animate(
        [{ translate: `${x}px ${y}px` }, { translate: "0 0" }],
        { id: "gallery-slide", duration: 420, easing: "cubic-bezier(.22,.8,.25,1)" },
      );
    });
    previousPositions.current.clear();
  }, [active, selected]);

  function move(step: number) {
    const next = ((selected ?? browseCenter()) + step + works.length) % works.length;
    capturePositions();
    if (selected !== null) {
      setSelected(next);
    } else {
      setCaptionOffset(0);
      if (next !== position) {
        setPosition(next);
      } else {
        const animation = galleryAnimation(track.current);
        if (animation) animation.currentTime = 0;
        previousPositions.current.clear();
      }
    }
  }

  function select(index: number | null) {
    capturePositions();
    if (selected === null && index !== null) {
      setPosition(browseCenter());
      setCaptionOffset(0);
    }
    setSelected(index === selected ? null : index);
  }

  function closeSelection() {
    track.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
    select(null);
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    dragged.current = false;
    if (selected !== null) return;
    dragStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.dataset.pointerDown = "true";
  }

  function updateDrag(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (start?.id !== event.pointerId) return;
    const x = event.clientX - start.x;
    if (!dragged.current) {
      if (Math.abs(x) < 8 || Math.abs(x) <= Math.abs(event.clientY - start.y)) return;
      dragged.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
    }
    const distance = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : x * .65;
    event.currentTarget.style.setProperty("--gallery-drag", `${Math.max(-120, Math.min(120, distance))}px`);
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (start?.id !== event.pointerId) return;
    dragStart.current = null;
    const x = event.clientX - start.x;
    if (event.type === "pointerup" && dragged.current && Math.abs(x) >= 42) move(x < 0 ? 1 : -1);
    delete event.currentTarget.dataset.dragging;
    delete event.currentTarget.dataset.pointerDown;
    event.currentTarget.style.removeProperty("--gallery-drag");
  }

  return (
    <section
      className="landing-gallery"
      data-mode={selected === null ? "browse" : "focus"}
      aria-label="Sorotan koleksi maestro"
      onKeyDown={(event) => {
        if (event.key === "Escape" && selected !== null) {
          event.preventDefault();
          closeSelection();
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="landing-gallery-caption" aria-live={selected !== null ? "polite" : "off"}>
        <h2>{workInCenter.title}</h2>
        <p>{workInCenter.artist}</p>
      </div>
      <p className="landing-gallery-hint">
        {selected === null
          ? "Pilih karya untuk menghentikan galeri dan melihat detailnya."
          : "Klik di mana saja untuk kembali ke galeri."}
      </p>
      <div
        ref={track}
        className="landing-gallery-track"
        data-selected={selected !== null}
        style={{ "--gallery-count": works.length } as CSSProperties}
        onPointerDown={startDrag}
        onPointerMove={updateDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={(event) => {
          if (event.target === event.currentTarget) finishDrag(event);
        }}
        onPointerLeave={(event) => {
          if (!dragged.current) finishDrag(event);
        }}
        onClickCapture={(event) => {
          if (dragged.current && event.detail > 0) event.stopPropagation();
        }}
      >
        {offsets.map((offset) => {
          const index = (active + offset + works.length) % works.length;
          const work = works[index];
          return (
            <button
              key={work.id}
              type="button"
              className="landing-gallery-work"
              data-work={work.id}
              data-offset={offset}
              tabIndex={selected !== null && selected !== index ? -1 : undefined}
              style={selected === null ? { "--gallery-slot": offset } as CSSProperties : undefined}
              aria-pressed={selected === index}
              aria-label={`${work.title}, karya ${work.artist}`}
              onClick={selected === null ? () => select(index) : undefined}
            >
              <ArtImage
                key={work.id}
                src={`/art/${work.image}.jpg`}
                alt=""
                draggable={false}
                width={360}
                height={480}
                fetchPriority={offset === 0 ? "high" : undefined}
              />
            </button>
          );
        })}
        {selected !== null && (
          <>
            <div className="landing-gallery-note landing-gallery-colors">
              <h3>Palet warna</h3>
              <ul>
                {workInCenter.colors.map((color) => (
                  <li key={color}>
                    <span aria-hidden="true" style={{ backgroundColor: color }} />
                    {color}
                  </li>
                ))}
              </ul>
            </div>
            <div className="landing-gallery-note landing-gallery-description">
              <h3>Tentang karya</h3>
              <p>{workInCenter.description}</p>
            </div>
          </>
        )}
      </div>
      {selected !== null && (
        <div className="landing-gallery-selection-actions">
          <Link ref={detailLink} href={`/artworks/${workInCenter.id}`} className="button primary">Lihat detail karya</Link>
        </div>
      )}
    </section>
  );
}
