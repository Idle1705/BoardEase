export function AuthShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <main id="main" className="flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto flex min-h-full max-w-[440px] flex-col justify-center px-4 py-10">
        <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-title2 font-semibold tracking-[-0.01em] text-ink">{title}</h1>
          <p className="mt-1.5 mb-6 text-body text-ink-2">{intro}</p>
          {children}
        </div>
      </div>
    </main>
  );
}
