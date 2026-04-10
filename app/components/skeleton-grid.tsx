export function SkeletonGrid() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-card-in rounded-2xl border border-border bg-surface p-5"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="space-y-3">
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="skeleton h-5 w-2/3" />
            <div className="space-y-1.5">
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3.5 w-4/5" />
            </div>
          </div>
          <div className="mt-5">
            <div className="skeleton h-9 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </section>
  );
}
