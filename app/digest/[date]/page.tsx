import { io } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DigestSkeleton, DigestView } from "@/components/digest-view";
import { getDigest } from "@/lib/storage";
import { formatBriefDate, isDateKey } from "@/lib/time";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  await io();
  const { date } = await params;
  if (!isDateKey(date)) return { title: "Brief" };
  return {
    title: formatBriefDate(date),
    description: `Morning Brief for ${formatBriefDate(date)}.`,
  };
}

export default function DigestPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  return (
    <Suspense fallback={<DigestSkeleton />}>
      <DayBrief params={params} />
    </Suspense>
  );
}

async function DayBrief({ params }: { params: Promise<{ date: string }> }) {
  await io();
  const { date } = await params;
  if (!isDateKey(date)) notFound();
  const digest = await getDigest(date);
  if (!digest) notFound();
  return <DigestView digest={digest} now={new Date()} />;
}
