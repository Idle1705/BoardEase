import Link from "next/link";
import { Logo } from "./site-header";

// Only routes that exist. No invented contact details, company credentials or policies.
const COLUMNS = [
  {
    title: "Renters",
    links: [
      ["Looking for a Board?", "/find"],
      ["Saved listings", "/saved"],
      ["How It Works", "/how-it-works"],
    ],
  },
  {
    title: "Property owners",
    links: [
      ["List Your Property", "/owners"],
      ["Create an owner account", "/sign-up?role=owner"],
      ["Owner portal", "/owner/dashboard"],
    ],
  },
  {
    title: "Account",
    links: [
      ["Log In", "/sign-in"],
      ["Sign Up", "/sign-up"],
      ["Your account", "/account"],
    ],
  },
  {
    title: "BoardEase",
    links: [
      ["About", "/about"],
      ["Photo credits", "/credits"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-limestone bg-porcelain">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-14 sm:px-8 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-4">
          <Logo />
          <p className="mt-4 max-w-[34ch] text-body text-ink-2">
            Rooms, bedspaces and boarding houses in Davao City, and the tools to manage them.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:col-span-8">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h2 className="text-footnote font-semibold text-ink">{c.title}</h2>
              <ul className="mt-3 flex flex-col">
                {c.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex min-h-10 items-center text-body text-ink-2 transition-colors duration-150 hover:text-clay"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2 border-t border-limestone px-5 py-6 text-footnote text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <p>BoardEase is in development. Listings shown today are demonstrations, not rooms for rent.</p>
        <p>Photos on this page: Unsplash, see Photo credits.</p>
      </div>
    </footer>
  );
}
