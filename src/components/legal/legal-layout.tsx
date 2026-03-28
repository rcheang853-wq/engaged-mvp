import Link from 'next/link';

export default function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to ENGAGED
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {new Date().toISOString().slice(0, 10)}</p>
      </div>

      <div className="prose prose-gray max-w-none">
        {children}
      </div>

      <hr className="my-10" />
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <Link className="hover:underline" href="/terms">Terms</Link>
        <Link className="hover:underline" href="/privacy">Privacy</Link>
        <Link className="hover:underline" href="/cookies">Cookies</Link>
      </div>
    </div>
  );
}
