"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";

/** Signs out through the browser client so the header's session state clears at once. */
export function LogOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { error } = await authClient.signOut();
        if (error) {
          setBusy(false);
          toast.error("Couldn't log out. Try again.");
          return;
        }
        router.replace("/");
        router.refresh();
      }}
      className="inline-flex h-11 items-center gap-2 rounded-md px-4 text-body font-medium text-ink ring-1 ring-black/12 hover:bg-white disabled:opacity-70"
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      Log out
    </button>
  );
}
