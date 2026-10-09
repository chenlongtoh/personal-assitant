import { Suspense } from "react";
import { io } from "next/cache";

import { DigestSkeleton, DigestView, EmptyBrief } from "@/components/digest-view";
import { getLatestDigest } from "@/lib/storage";

export default function HomePage() {
  return (
    <Suspense fallback={<DigestSkeleton />}>
      <LatestBrief />
    </Suspense>
  );
}

async function LatestBrief() {
  await io();
  const digest = await getLatestDigest();
  if (!digest) return <EmptyBrief />;
  return <DigestView digest={digest} now={new Date()} latest />;
}
