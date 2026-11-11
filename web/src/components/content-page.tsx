export function ContentPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main id="main" className="flex-1 overflow-y-auto bg-white">
      <div className="mx-auto max-w-[720px] px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-title1 font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {intro && <p className="mt-3 max-w-[60ch] text-callout text-ink-2">{intro}</p>}
        <div className="mt-10 flex flex-col gap-8 text-body text-ink-2">{children}</div>
      </div>
    </main>
  );
}
