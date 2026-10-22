import Link from "next/link";
import { supabaseAdmin, currentSellerId } from "@/lib/supabase/admin";
import { fmtDuration } from "@/lib/types";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = { ready: "bg-mint text-mint-ink", published: "bg-mint text-mint-ink", failed: "bg-blush text-blush-ink" };

export default async function LaunchesPage() {
  const { data } = await supabaseAdmin().from("launches").select("id,status,product_title,build_seconds,created_at")
    .eq("seller_id", currentSellerId()).order("created_at", { ascending: false }).limit(50);
  const items = data ?? [];
  return (
    <main className="flex flex-col gap-6 px-6 pb-12 pt-4 sm:px-14">
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">My launches</h1>
        <Link href="/" className="btn btn-primary">New launch</Link>
      </div>
      {items.length === 0 ? (
        <div className="tile border-[3px] border-dashed border-ink bg-white p-10 text-center">
          <div className="text-xl font-bold">Nothing here yet</div>
          <div className="mt-1 text-ink-mute">Drop a making-of video and your first kit will show up here.</div>
        </div>
      ) : (
        <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
            <li key={l.id}>
              <Link href={`/launches/${l.id}`} className="tile flex h-full flex-col gap-3 border-2 border-ink bg-white p-5 no-underline text-ink hover:bg-chalk">
                <span className={`w-max rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[l.status] ?? "bg-butter text-butter-ink"}`}>{l.status}</span>
                <span className="text-lg font-bold leading-snug">{l.product_title ?? "Building…"}</span>
                <span className="mt-auto text-xs text-ink-mute">{new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{l.build_seconds ? ` · built in ${fmtDuration(l.build_seconds)}` : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
