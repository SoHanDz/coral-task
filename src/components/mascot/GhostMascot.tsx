"use client";

import { useEffect, useRef, useState } from "react";
import { useQuotes } from "@/components/mascot/QuotesProvider";

/** All of the ghost's colours in one place — swap these to re-skin it. */
const COLORS = {
  body: "#ddd6fe",
  outline: "#a78bfa",
  fold: "#c4b5fd",
  eyeSocket: "#faf5ff",
  pupil: "#2e1065",
  blush: "#f9a8d4",
  mouth: "#5b21b6",
};

/** How far (in SVG units) a pupil can travel inside its eye, per axis. */
const MAX_PUPIL_X = 4.5;
const MAX_PUPIL_Y = 5.5;
/** Cursor distance (px) at which the pupil reaches its full offset. */
const FULL_LOOK_DISTANCE = 140;

const FALLBACK_LINE = "Boo! 👻";

/** Squash-and-stretch bounce played when the ghost is clicked. */
const IMPACT_KEYFRAMES: Keyframe[] = [
  { transform: "scale(1, 1)" },
  { transform: "scale(1.14, 0.84)", offset: 0.25 },
  { transform: "scale(0.92, 1.1)", offset: 0.55 },
  { transform: "scale(1.03, 0.98)", offset: 0.8 },
  { transform: "scale(1, 1)" },
];

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A small bedsheet ghost parked in the corner. Its eyes follow the cursor, and
 * clicking it gives a light squash impact and makes it "say" one of the user's
 * quotes in a speech bubble. Pupils are moved directly through refs (no React
 * state), so tracking the pointer never re-renders anything.
 */
export function GhostMascot() {
  const { quotes } = useQuotes();
  const [line, setLine] = useState<string | null>(null);
  const [impactCount, setImpactCount] = useState(0);

  const leftEye = useRef<SVGEllipseElement>(null);
  const rightEye = useRef<SVGEllipseElement>(null);
  const leftPupil = useRef<SVGGElement>(null);
  const rightPupil = useRef<SVGGElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const lastQuoteIndex = useRef<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    function look(eye: SVGEllipseElement | null, pupil: SVGGElement | null, target: { x: number; y: number }) {
      if (!eye || !pupil) return;
      const rect = eye.getBoundingClientRect();
      const dx = target.x - (rect.left + rect.width / 2);
      const dy = target.y - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      if (distance === 0) {
        pupil.style.transform = "translate(0px, 0px)";
        return;
      }
      const strength = Math.min(1, distance / FULL_LOOK_DISTANCE);
      const x = (dx / distance) * MAX_PUPIL_X * strength;
      const y = (dy / distance) * MAX_PUPIL_Y * strength;
      pupil.style.transform = `translate(${x}px, ${y}px)`;
    }

    function update() {
      frame = 0;
      if (!pointer) return;
      look(leftEye.current, leftPupil.current, pointer);
      look(rightEye.current, rightPupil.current, pointer);
    }

    function onPointerMove(event: PointerEvent) {
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(update);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  /** A random quote, never the same one twice in a row when there is a choice. */
  function pickLine(): string {
    if (quotes.length === 0) return FALLBACK_LINE;
    const choices = quotes.map((_, index) => index).filter((index) => index !== lastQuoteIndex.current);
    const pool = choices.length > 0 ? choices : [0];
    const index = pool[Math.floor(Math.random() * pool.length)];
    lastQuoteIndex.current = index;
    return quotes[index].text;
  }

  function handleClick() {
    const next = pickLine();
    setLine(next);
    setImpactCount((count) => count + 1);

    if (!prefersReducedMotion()) {
      body.current?.animate(IMPACT_KEYFRAMES, { duration: 420, easing: "ease-out" });
    }

    if (hideTimer.current) clearTimeout(hideTimer.current);
    // Longer quotes stay up a little longer.
    const visibleFor = Math.min(12000, Math.max(4000, next.length * 90));
    hideTimer.current = setTimeout(() => setLine(null), visibleFor);
  }

  const speaking = line !== null;

  return (
    <div className="pointer-events-none fixed right-3 bottom-[4.5rem] z-30 select-none lg:right-6 lg:bottom-2">
      <div role="status" aria-live="polite" className="absolute right-0 bottom-full mb-3 w-max max-w-[min(240px,calc(100vw-5rem))]">
        {line && (
          <div
            key={impactCount}
            className="ghost-bubble relative rounded-2xl border border-violet-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-lg"
          >
            <p className="line-clamp-5 break-words">{line === FALLBACK_LINE ? line : `“${line}”`}</p>
            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 right-8 size-3 rotate-45 border-r border-b border-violet-200 bg-white"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleClick}
        aria-label="Con ma — bấm để nghe một câu quote"
        className="pointer-events-auto relative block cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-violet-300"
      >
        {impactCount > 0 && (
          <span key={impactCount} aria-hidden="true" className="ghost-ring absolute inset-0 rounded-full border-2 border-violet-300" />
        )}
        <div ref={body} style={{ transformOrigin: "50% 100%" }}>
          <svg
            viewBox="0 0 120 140"
            aria-hidden="true"
            className="ghost-float h-20 w-[69px] drop-shadow-md lg:h-24 lg:w-[82px]"
          >
            {/* Sheet body: round head, soft folds, scalloped hem. */}
            <path
              d="M60 8 C30 8 14 30 14 62 L14 118 C14 124 19 126 23 122 C28 117 33 117 38 122 C43 127 49 127 54 122 C57 119 63 119 66 122 C71 127 77 127 82 122 C87 117 92 117 97 122 C101 126 106 124 106 118 L106 62 C106 30 90 8 60 8 Z"
              fill={COLORS.body}
              stroke={COLORS.outline}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Little fold lines on the sheet. */}
            <path d="M28 96 C30 104 30 110 28 116" fill="none" stroke={COLORS.fold} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M92 96 C90 104 90 110 92 116" fill="none" stroke={COLORS.fold} strokeWidth="2.5" strokeLinecap="round" />

            {/* Eyes: socket + pupil that slides toward the cursor. */}
            <g className="ghost-blink">
              <ellipse ref={leftEye} cx="44" cy="62" rx="11" ry="13" fill={COLORS.eyeSocket} stroke={COLORS.outline} strokeWidth="1.5" />
              <ellipse ref={rightEye} cx="76" cy="62" rx="11" ry="13" fill={COLORS.eyeSocket} stroke={COLORS.outline} strokeWidth="1.5" />
              <g ref={leftPupil} style={{ transition: "transform 80ms ease-out" }}>
                <circle cx="44" cy="62" r="6.5" fill={COLORS.pupil} />
                <circle cx="46.2" cy="59.5" r="2" fill="#ffffff" />
              </g>
              <g ref={rightPupil} style={{ transition: "transform 80ms ease-out" }}>
                <circle cx="76" cy="62" r="6.5" fill={COLORS.pupil} />
                <circle cx="78.2" cy="59.5" r="2" fill="#ffffff" />
              </g>
            </g>

            {/* Blush + mouth (a small smile; opens while it is talking). */}
            <ellipse cx="30" cy="82" rx="7" ry="4.5" fill={COLORS.blush} opacity="0.7" />
            <ellipse cx="90" cy="82" rx="7" ry="4.5" fill={COLORS.blush} opacity="0.7" />
            {speaking ? (
              <ellipse cx="60" cy="88" rx="5" ry="5.5" fill={COLORS.mouth} />
            ) : (
              <path d="M54 86 Q60 92 66 86" fill="none" stroke={COLORS.mouth} strokeWidth="2.5" strokeLinecap="round" />
            )}
          </svg>
        </div>
      </button>
    </div>
  );
}
