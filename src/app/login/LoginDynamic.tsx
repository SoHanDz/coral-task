type LoginSearchParams = Promise<{ error?: string; message?: string; next?: string }>;

export async function LoginAlerts({ searchParams }: { searchParams: LoginSearchParams }) {
  const { error, message } = await searchParams;

  return (
    <>
      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      {message && (
        <p className="mb-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700">{message}</p>
      )}
    </>
  );
}

export async function LoginNextField({ searchParams }: { searchParams: LoginSearchParams }) {
  const { next } = await searchParams;
  return <input type="hidden" name="next" value={next ?? "/"} />;
}
