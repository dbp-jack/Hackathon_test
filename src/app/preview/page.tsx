import Link from "next/link";

// Index of design previews. Sample data only; the real flow needs Supabase (see README).
const PAGES = [
  { href: "/", name: "Upload", note: "The real page. Building a kit needs Supabase." },
  { href: "/preview/building", name: "Building", note: "Result screen while Claude works (sample data)." },
  { href: "/preview/ready", name: "Ready", note: "Finished kit (sample data)." },
  { href: "/preview/failed", name: "Failed", note: "When the build stops (sample data)." },
];

export default function PreviewIndex() {
  return (
    <main className="flex flex-col gap-6 px-6 pb-12 pt-4 sm:px-14">
      <h1 className="text-3xl font-extrabold tracking-tight">Screen previews</h1>
      <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {PAGES.map((p) => (
          <li key={p.href}>
            <Link href={p.href} className="tile flex h-full flex-col gap-2 border-2 border-ink bg-white p-5 no-underline text-ink hover:bg-chalk">
              <span className="text-lg font-bold">{p.name}</span>
              <span className="text-sm text-ink-mute">{p.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
