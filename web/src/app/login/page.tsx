import { LoginForm } from '@/components/AuthForms';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-semibold">Log in</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <LoginForm nextPath={next} />
      </div>
    </div>
  );
}
