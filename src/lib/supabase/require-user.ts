import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Bạn cần đăng nhập để thực hiện hành động này.");
  }

  return { supabase, userId: data.user.id };
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}
