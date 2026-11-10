"use client";

import { useEffect, useRef, useState } from "react";
import { useQuotes } from "@/components/mascot/QuotesProvider";

/** All of the ghost's colours in one place — swap these to re-skin it. */
const COLORS = {
  body: "#ffa500",
  eyeSocket: "#ffffff",
  pupil: "#3c34f0",
};

/** How far (in SVG units) a pupil can travel inside its eye, per axis. */
const MAX_PUPIL_X = 6;
const MAX_PUPIL_Y = 8;
/** Pupils rest looking slightly down-left until the cursor moves. */
const PUPIL_REST = "translate(-6px, 2.3px)";
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
 * A small arcade-style orange ghost parked in the corner. Its eyes follow the cursor, and
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
            viewBox="10 10 101 100"
            aria-hidden="true"
            className="ghost-float h-20 w-20 drop-shadow-md lg:h-24 lg:w-24"
          >
            {/* Body: round dome, straight sides, three-scallop hem. */}
            <path
              d="M12.7 105.5 C13 85 14 62 20 42 C25 25 40 13 60 13 C80 13 95 25 100 42 C106 62 107 85 107.7 105.5 C103 92 84 92 78.3 105.5 C72 92 48 92 41.7 105.5 C36 92 18 92 12.7 105.5 Z"
              fill={COLORS.body}
              strokeLinejoin="round"
            />

            {/* Eyes: white socket + blue pupil that slides toward the cursor. */}
            <g className="ghost-blink">
              <ellipse ref={leftEye} cx="34.7" cy="50" rx="14" ry="17.5" fill={COLORS.eyeSocket} />
              <ellipse ref={rightEye} cx="74.3" cy="50" rx="14" ry="17.5" fill={COLORS.eyeSocket} />
              <g ref={leftPupil} style={{ transform: PUPIL_REST, transition: "transform 80ms ease-out" }}>
                <ellipse cx="34.7" cy="50" rx="7" ry="8" fill={COLORS.pupil} />
              </g>
              <g ref={rightPupil} style={{ transform: PUPIL_REST, transition: "transform 80ms ease-out" }}>
                <ellipse cx="74.3" cy="50" rx="7" ry="8" fill={COLORS.pupil} />
              </g>
            </g>
          </svg>
        </div>
      </button>
    </div>
  );
}
