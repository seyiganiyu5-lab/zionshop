import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";
import { ProductFields } from "@/components/ProductFields";
import { SubmitButton } from "@/components/SubmitButton";
import { createProduct } from "../actions";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        title="New product"
        subtitle="Create the product once, then add phones (by IMEI) or accessory stock to it."
      />
      <ActionForm action={createProduct} className="card max-w-2xl space-y-4">
        <fieldset>
          <span className="label">Type</span>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="category" value="PHONE" defaultChecked /> Phone (tracked by IMEI)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="category" value="ACCESSORY" /> Accessory (tracked by quantity)
            </label>
          </div>
        </fieldset>
        <ProductFields />
        <SubmitButton>Create product</SubmitButton>
      </ActionForm>
    </>
  );
}
