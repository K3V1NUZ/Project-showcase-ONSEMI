"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { mealTypeForNow } from "@/lib/mealTypeForTime";
import { MEAL_ORDER, type MealType } from "@/lib/types";
import { toISODate } from "@/lib/dateHelpers";

type State =
  | { kind: "requesting" }
  | { kind: "scanning" }
  | { kind: "detected"; code: string }
  | { kind: "denied" }
  | { kind: "error"; message: string };

// Minimal typing for the browser's native BarcodeDetector, which TypeScript's
// lib.dom doesn't ship yet. Only fields we use.
type NativeBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (
    source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap
  ) => Promise<NativeBarcode[]>;
};
type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

function getNativeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    BarcodeDetector?: BarcodeDetectorCtor;
  };
  return w.BarcodeDetector || null;
}

function Header({ label }: { label: string }) {
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center px-2 py-2 pt-safe z-10">
      <Link
        href="/"
        aria-label="Back"
        className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <div className="flex-1 text-center text-base font-semibold text-white pr-10">
        {label}
      </div>
    </div>
  );
}

function ScanScreen() {
  const router = useRouter();
  const params = useSearchParams();

  const dateParam = params.get("date");
  const mealParam = params.get("meal") as MealType | null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [state, setState] = useState<State>({ kind: "requesting" });
  const [typing, setTyping] = useState(false);
  const [typedCode, setTypedCode] = useState("");
  const [zoom, setZoom] = useState<{
    current: number;
    min: number;
    max: number;
    step: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let stopZxing: (() => void) | null = null;
    let running = true;

    const finish = (code: string) => {
      if (cancelled) return;
      cancelled = true;
      running = false;
      setState({ kind: "detected", code });
      const meal =
        mealParam && MEAL_ORDER.includes(mealParam)
          ? mealParam
          : mealTypeForNow();
      const date = dateParam || toISODate(new Date());
      router.replace(
        `/add?date=${encodeURIComponent(date)}&meal=${meal}&barcode=${encodeURIComponent(code)}`
      );
    };

    (async () => {
      try {
        // 720p is a well-tested sweet spot on iOS Safari — 1080p started
        // causing focus/lag issues on some devices without a matching
        // improvement in decode rate.
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        // Feature-detect zoom + continuous focus in one capabilities pass.
        const caps =
          (track.getCapabilities?.() as {
            focusMode?: string[];
            zoom?: { min: number; max: number; step: number };
          }) || {};

        if (caps.focusMode?.includes("continuous")) {
          try {
            await track.applyConstraints({
              advanced: [
                { focusMode: "continuous" } as unknown as MediaTrackConstraintSet,
              ],
            });
          } catch {
            // best-effort
          }
        }

        if (caps.zoom) {
          const { min, max, step } = caps.zoom;
          const settings =
            (track.getSettings?.() as { zoom?: number }) || {};
          setZoom({
            current: settings.zoom ?? min,
            min,
            max,
            step: step || 0.1,
          });
        }

        setState({ kind: "scanning" });

        // Prefer the browser's native BarcodeDetector — hardware-accelerated
        // on iOS 17+, way faster than the JS decoder.
        const Ctor = getNativeDetector();
        if (Ctor) {
          const detector = new Ctor({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
          });

          // Reusable canvas for rotating the frame 90°. Barcodes held sideways
          // aren't caught by the default (horizontal) scan direction, so we
          // pass in a rotated copy as well and take whichever hits first.
          const rotCanvas = document.createElement("canvas");
          const rotCtx = rotCanvas.getContext("2d");
          let toggle = false; // alternate frames to keep per-cycle cost low

          const loop = async () => {
            if (!running || cancelled) return;
            try {
              // Odd cycles: raw video. Even cycles: 90°-rotated frame.
              let source: HTMLVideoElement | HTMLCanvasElement = video;
              toggle = !toggle;
              if (toggle && rotCtx && video.videoWidth > 0) {
                const w = video.videoWidth;
                const h = video.videoHeight;
                rotCanvas.width = h;
                rotCanvas.height = w;
                rotCtx.save();
                rotCtx.translate(h / 2, w / 2);
                rotCtx.rotate(Math.PI / 2);
                rotCtx.drawImage(video, -w / 2, -h / 2);
                rotCtx.restore();
                source = rotCanvas;
              }
              const results = await detector.detect(source);
              if (results.length > 0) {
                finish(results[0].rawValue);
                return;
              }
            } catch {
              // A single failed frame is fine — try the next one.
            }
            if (running && !cancelled) requestAnimationFrame(loop);
          };
          loop();
          return;
        }

        // Fallback: zxing (dynamic import so native-only devices don't
        // pay the parse cost).
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
          await Promise.all([
            import("@zxing/browser"),
            import("@zxing/library"),
          ]);
        if (cancelled) return;
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        const controls = await reader.decodeFromVideoElement(
          video,
          (result) => {
            if (result && !cancelled) {
              finish(result.getText());
            }
          }
        );
        stopZxing = () => controls.stop();
      } catch (e) {
        if (cancelled) return;
        const name =
          e && typeof e === "object" && "name" in e
            ? String((e as { name: string }).name)
            : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setState({ kind: "denied" });
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setState({
            kind: "error",
            message: "No camera available on this device.",
          });
        } else {
          setState({
            kind: "error",
            message: e instanceof Error ? e.message : "Camera failed to start",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      running = false;
      stopZxing?.();
      trackRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [dateParam, mealParam, router]);

  const applyZoom = async (target: number) => {
    if (!zoom || !trackRef.current) return;
    const clamped = Math.max(zoom.min, Math.min(zoom.max, target));
    if (clamped === zoom.current) return;
    setZoom({ ...zoom, current: clamped });
    try {
      await trackRef.current.applyConstraints({
        advanced: [
          { zoom: clamped } as unknown as MediaTrackConstraintSet,
        ],
      });
    } catch {
      // best-effort
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <Header label={state.kind === "detected" ? "Loading…" : "Scan barcode"} />

      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Framing overlay — dark border + transparent (near-)square window
          so barcodes fit whether held horizontally or vertically. */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 bottom-1/2 mb-40 bg-black/60" />
        <div className="absolute inset-x-0 bottom-0 top-1/2 mt-40 bg-black/60" />
        <div className="absolute inset-y-1/2 -mt-40 -mb-40 left-0 w-4 bg-black/60" />
        <div className="absolute inset-y-1/2 -mt-40 -mb-40 right-0 w-4 bg-black/60" />
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-80 rounded-2xl border-2 border-white/80" />
      </div>

      <div className="absolute inset-x-0 bottom-0 pb-safe pb-8 flex flex-col items-center gap-3">
        {state.kind === "requesting" && (
          <div className="text-sm text-white/80 px-6 text-center bg-black/40 rounded-full py-2">
            Requesting camera…
          </div>
        )}
        {state.kind === "scanning" && !typing && (
          <>
            {zoom && zoom.max > zoom.min && (
              <div className="flex items-center gap-2 bg-black/50 rounded-full py-1 pl-1 pr-1">
                <button
                  onClick={() => applyZoom(zoom.current - Math.max(zoom.step, 0.5))}
                  className="w-9 h-9 rounded-full bg-white/10 text-white text-lg font-medium flex items-center justify-center disabled:opacity-40"
                  disabled={zoom.current <= zoom.min}
                  aria-label="Zoom out"
                  type="button"
                >
                  −
                </button>
                <span className="text-white text-sm tabular-nums px-1 min-w-[3ch] text-center">
                  {zoom.current.toFixed(1)}×
                </span>
                <button
                  onClick={() => applyZoom(zoom.current + Math.max(zoom.step, 0.5))}
                  className="w-9 h-9 rounded-full bg-white/10 text-white text-lg font-medium flex items-center justify-center disabled:opacity-40"
                  disabled={zoom.current >= zoom.max}
                  aria-label="Zoom in"
                  type="button"
                >
                  +
                </button>
              </div>
            )}
            <div className="text-sm text-white/90 px-6 text-center bg-black/40 rounded-full py-2">
              Point at a barcode
            </div>
            <button
              onClick={() => setTyping(true)}
              className="text-sm text-white/90 underline underline-offset-4"
              type="button"
            >
              Type barcode instead
            </button>
          </>
        )}
        {state.kind === "detected" && (
          <div className="text-sm text-white/90 px-6 text-center bg-black/40 rounded-full py-2 tabular-nums">
            {state.code}
          </div>
        )}
        {state.kind === "denied" && (
          <div className="mx-4 max-w-sm bg-card text-app rounded-2xl p-4 text-sm text-center space-y-3">
            <div className="font-semibold">Camera access blocked</div>
            <div className="text-muted">
              Enable camera access for this site in Safari settings, then
              return here.
            </div>
            <Link
              href="/"
              className="inline-block mt-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "var(--color-accent-strong)" }}
            >
              Back
            </Link>
          </div>
        )}
        {state.kind === "error" && (
          <div className="mx-4 max-w-sm bg-card text-app rounded-2xl p-4 text-sm text-center space-y-3">
            <div className="font-semibold">Camera error</div>
            <div className="text-muted">{state.message}</div>
            <Link
              href="/"
              className="inline-block mt-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "var(--color-accent-strong)" }}
            >
              Back
            </Link>
          </div>
        )}
      </div>

      {typing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-6 bg-black/70">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const code = typedCode.trim();
              if (!/^[0-9]{6,14}$/.test(code)) return;
              const meal =
                mealParam && MEAL_ORDER.includes(mealParam)
                  ? mealParam
                  : mealTypeForNow();
              const date = dateParam || toISODate(new Date());
              router.replace(
                `/add?date=${encodeURIComponent(date)}&meal=${meal}&barcode=${encodeURIComponent(code)}`
              );
            }}
            className="w-full max-w-sm bg-card text-app rounded-2xl p-4 space-y-3"
          >
            <div className="font-semibold text-center">Enter barcode</div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              maxLength={14}
              placeholder="e.g. 5900396017123"
              value={typedCode}
              onChange={(e) =>
                setTypedCode(e.target.value.replace(/\D/g, ""))
              }
              className="w-full h-11 px-3 rounded-xl bg-app border border-app focus:outline-none focus:border-[var(--color-accent)] tabular-nums text-center"
            />
            <div className="text-xs text-muted text-center">
              Usually 8 or 13 digits. Found under the black stripes on the
              package.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTyping(false);
                  setTypedCode("");
                }}
                className="h-11 rounded-xl border border-app text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!/^[0-9]{6,14}$/.test(typedCode.trim())}
                className="h-11 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "var(--color-accent-strong)" }}
              >
                Look up
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black flex items-center justify-center text-white/70 text-sm">
          Loading…
        </div>
      }
    >
      <ScanScreen />
    </Suspense>
  );
}
