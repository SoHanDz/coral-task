import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export async function SidebarProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <div className="flex items-center gap-2 border-t border-white/10 px-3 py-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-slate-400">{data.user?.email ?? "Chưa đăng nhập"}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Đăng xuất"
          className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-200 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
