export function EmptyState() {
  return (
    <section className="rounded-[28px] border border-dashed border-stone-300 bg-white px-8 py-12 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-stone-900">Brak przypisanych aplikacji</h2>
      <p className="mt-3 text-sm leading-6 text-stone-600">
        Nie masz obecnie przypisanych aplikacji produkcyjnych. Skontaktuj się z administratorem, jeśli ten widok
        powinien zawierać więcej pozycji.
      </p>
    </section>
  );
}
