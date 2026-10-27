import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// getClaims() verifies the JWT locally (no Auth server round trip) and
// cache() dedupes it, so the several fetchers one page calls in parallel
// authenticate once per request instead of once each.
const getSession = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  return { supabase, claims: error ? null : data?.claims ?? null };
});

export async function requireUser() {
  const { supabase, claims } = await getSession();

  if (!claims?.sub) {
    throw new Error("Bạn cần đăng nhập để thực hiện hành động này.");
  }

  return { supabase, userId: claims.sub };
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const { claims } = await getSession();
  return typeof claims?.email === "string" ? claims.email : null;
}
