"use client";

import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "./ui/primitives";
import { SegmentedControl, Sheet } from "./ui/interactive";

type Format = "story" | "square";

/** "Share" button + sheet: pick story or square, preview, then share (phones) or download. */
export function ShareWorkout({ workoutId, fileName }: { workoutId: string; fileName: string }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>("story");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = `/share/workout/${workoutId}?format=${format}`;
  // The image is prepared as soon as the sheet opens (or the shape changes), so tapping
  // Share can call navigator.share right away: Safari rejects a share that comes after a
  // slow await, as the tap no longer counts as the user's action.
  const [prepared, setPrepared] = useState<{ src: string; file: File } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(src)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        if (!cancelled) setPrepared({ src, file: new File([blob], `${fileName}-${format}.png`, { type: "image/png" }) });
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't create the image. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, src, fileName, format]);

  function download(file: File) {
    const url = URL.createObjectURL(file);
    const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function share() {
    const file = prepared?.src === src ? prepared.file : null;
    if (!file) return; // the button stays disabled until the image is ready
    setError(null);
    setBusy(true);
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "My workout" });
      else download(file); // desktop browsers mostly can't share files
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // they closed the share sheet
      download(file); // e.g. NotAllowedError: save it instead of failing
    } finally {
      setBusy(false);
    }
  }
  const ready = prepared?.src === src;

  return (
    <>
      <Button variant="tinted" className="flex-1" onClick={() => setOpen(true)}>
        <Share2 className="size-5" aria-hidden /> Share
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Share workout"
        footer={
          <div className="flex flex-col gap-2">
            {error && (
              <p role="alert" className="text-subhead text-red-text">
                {error}
              </p>
            )}
            <Button className="w-full" onClick={share} disabled={busy || !ready} aria-busy={busy || !ready}>
              {!ready ? "Preparing…" : (
                <>
                  <Share2 className="size-5" aria-hidden /> Share image
                </>
              )}
            </Button>
            <a href={src} download={`${fileName}-${format}.png`} className="inline-flex min-h-11 items-center justify-center gap-2 text-body text-accent">
              <Download className="size-4" aria-hidden /> Download instead
            </a>
          </div>
        }
      >
        <SegmentedControl
          label="Image shape"
          value={format}
          onChange={setFormat}
          className="mb-4"
          options={[
            { value: "story", label: "Story 9:16" },
            { value: "square", label: "Square 1:1" },
          ]}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- a generated PNG preview, not a static asset */}
        <img
          key={src}
          src={src}
          alt={`Preview of the ${format === "story" ? "story" : "square"} share image`}
          className={format === "story" ? "mx-auto aspect-[9/16] max-h-[52dvh] rounded-xl bg-fill-3" : "mx-auto aspect-square max-h-[52dvh] w-full max-w-sm rounded-xl bg-fill-3"}
        />
      </Sheet>
    </>
  );
}
