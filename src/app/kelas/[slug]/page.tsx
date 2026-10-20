import { notFound } from "next/navigation";
import { getClassBySlug } from "@/lib/server/kelas";
import { ClassDetailClient } from "@/components/kelas/ClassDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const classData = await getClassBySlug(slug);

  if (!classData) {
    return { title: "Kelas Tidak Ditemukan — Basecamp Padel" };
  }

  return {
    title: `${classData.title} · Kelas — Basecamp Padel`,
    description: classData.description,
  };
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const classData = await getClassBySlug(slug);

  if (!classData) {
    notFound();
  }

  return <ClassDetailClient classData={classData} />;
}
