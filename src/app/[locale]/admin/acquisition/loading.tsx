export default function LoadingAcquisition() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10" aria-busy="true">
      <p role="status" className="text-sm font-medium text-neutral-600">
        Loading campaign placements…
      </p>
      <div aria-hidden="true" className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-2xl border border-neutral-100 bg-gradient-to-br from-white to-[#fff3f5] motion-safe:animate-pulse" />
        <div className="h-28 rounded-2xl border border-neutral-100 bg-gradient-to-br from-white to-[#fff3f5] motion-safe:animate-pulse" />
      </div>
      <div aria-hidden="true" className="mt-5 h-48 rounded-2xl border border-neutral-100 bg-neutral-50 motion-safe:animate-pulse" />
    </main>
  );
}
