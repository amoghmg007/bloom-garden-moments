import { createFileRoute } from "@tanstack/react-router";
import MothersDayScene from "@/components/MothersDayScene";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Happy Mother's Day · A Garden in Bloom" },
      {
        name: "description",
        content:
          "A 3D pastel garden that blooms as you scroll, with floating photo frames and a gold 'Happy Mother's Day' message.",
      },
    ],
  }),
});

const DEFAULT_PHOTOS = [
  "/images/WhatsApp Image 2026-05-09 at 7.44.55 PM.jpeg",
  "/images/WhatsApp Image 2026-05-09 at 7.44.55 PM (1).jpeg",
  "/images/WhatsApp Image 2026-05-09 at 7.44.55 PM (2).jpeg",
  "/images/WhatsApp Image 2026-05-09 at 7.44.56 PM.jpeg",
];

function Index() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <MothersDayScene photos={DEFAULT_PHOTOS} />

      {/* Overlay UI */}
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <header className="pointer-events-auto flex items-center justify-between p-6">
          <div className="text-sm uppercase tracking-[0.3em] text-foreground/70">
            Mother's Day · 2026
          </div>
        </header>

        <div className="mt-auto p-6 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-xs uppercase tracking-[0.25em] text-foreground/70 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[oklch(0.82_0.13_85)]" />
            Scroll to walk the garden
          </div>
        </div>
      </div>
    </div>
  );
}
