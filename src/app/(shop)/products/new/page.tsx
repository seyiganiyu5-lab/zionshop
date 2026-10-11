import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";
import { ProductFields } from "@/components/ProductFields";
import { SubmitButton } from "@/components/SubmitButton";
import { getI18n } from "@/lib/i18n/server";
import { createProduct } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.product.newTitle };
}

export default async function NewProductPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.product.newTitle} subtitle={t.product.newSubtitle} />
      <ActionForm action={createProduct} className="card max-w-2xl space-y-4">
        <fieldset>
          <span className="label">{t.product.type}</span>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="category" value="PHONE" defaultChecked className="accent-brand" /> {t.product.typePhone}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="category" value="ACCESSORY" className="accent-brand" /> {t.product.typeAccessory}
            </label>
          </div>
        </fieldset>
        <ProductFields t={t} />
        <SubmitButton>{t.product.create}</SubmitButton>
      </ActionForm>
    </>
  );
}
