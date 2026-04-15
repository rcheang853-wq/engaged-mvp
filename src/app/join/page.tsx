import { Suspense } from 'react';
import JoinPageClient from './page-client';

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFB]" />}>
      <JoinPageClient />
    </Suspense>
  );
}
