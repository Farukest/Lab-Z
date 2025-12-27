'use client';

/**
 * Compose Page
 *
 * Visual contract builder interface
 */

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with drag-and-drop
const Composer = dynamic(
  () => import('@/components/composer').then((mod) => mod.Composer),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-neutral-500 text-sm">Loading Visual Builder...</p>
        </div>
      </div>
    )
  }
);

export default function ComposePage() {
  return <Composer />;
}
