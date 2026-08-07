import { RegisterForm } from '@/components/AuthForms';

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-semibold">Create your account</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <RegisterForm />
      </div>
    </div>
  );
}
