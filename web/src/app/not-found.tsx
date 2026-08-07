import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-slate-500">This event doesn&apos;t exist or was removed.</p>
      <Link href="/" className="mt-4 inline-block text-indigo-600 hover:underline">
        ← Back to events
      </Link>
    </div>
  );
}
