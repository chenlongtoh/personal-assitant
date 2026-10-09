import type { Metadata } from "next";
import { Suspense } from "react";
import { io } from "next/cache";

import { ArchiveList, DigestSkeleton } from "@/components/digest-view";
import { listDigestEntries } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Archive",
  description: "Past editions of Morning Brief.",
};

export default function ArchivePage() {
  return (
    <Suspense fallback={<DigestSkeleton />}>
      <ArchiveContents />
    </Suspense>
  );
}

async function ArchiveContents() {
  await io();
  const entries = await listDigestEntries();
  return <ArchiveList entries={entries} />;
}
