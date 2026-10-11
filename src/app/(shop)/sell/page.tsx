import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { SellScreen } from "./SellScreen";

export const metadata: Metadata = { title: "Sell" };

export default function SellPage() {
  return (
    <>
      <PageHeader title="New sale" subtitle="Scan or type an IMEI, or search by model." />
      <SellScreen currency={process.env.NEXT_PUBLIC_CURRENCY || "NGN"} />
    </>
  );
}
