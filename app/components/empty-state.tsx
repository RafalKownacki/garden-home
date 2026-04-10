export function EmptyState() {
  return (
    <section className="animate-card-in flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-8 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-strong text-3xl">
        🏡
      </div>
      <h2 className="mt-5 text-lg font-semibold text-foreground">Brak przypisanych aplikacji</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        Nie masz obecnie przypisanych aplikacji produkcyjnych. Skontaktuj się z administratorem, jeśli powinny tu
        być widoczne pozycje.
      </p>
    </section>
  );
}
