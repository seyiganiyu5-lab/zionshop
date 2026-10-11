import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";
import { ProductFields } from "@/components/ProductFields";
import { SubmitButton } from "@/components/SubmitButton";
import { getI18n } from "@/lib/i18n/server";
import { createProduct } from "../actions";
import { StockChoice } from "./StockChoice";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.product.newTitle };
}

export default async function NewProductPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.product.newTitle} subtitle={t.product.newSubtitle} />
      <ActionForm action={createProduct} className="card max-w-2xl space-y-4">
        <ProductFields t={t} />
        <StockChoice />
        <SubmitButton>{t.product.create}</SubmitButton>
      </ActionForm>
    </>
  );
}
