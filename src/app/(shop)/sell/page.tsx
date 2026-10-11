import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { getI18n } from "@/lib/i18n/server";
import { SellScreen } from "./SellScreen";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.sell.title };
}

export default async function SellPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.sell.title} subtitle={t.sell.subtitle} />
      <SellScreen />
    </>
  );
}
