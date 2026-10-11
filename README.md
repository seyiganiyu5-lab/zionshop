# Zionshop

Inventory and sales for a single phone shop.

- **Phones** are tracked one by one by IMEI (new, used or refurbished), each with its own cost price.
- **Accessories** (chargers, cases, screen guards…) are tracked by quantity.
- **Sell** screen: scan or type an IMEI, or search by model, adjust the price if you agreed a discount, pick cash / transfer / card, and print a receipt.
- **Dashboard**: today's sales and profit, last 30 days, stock value, and items running low.
- **Sales history** with profit per sale. A sale entered by mistake can be cancelled, which puts the items back into stock.
- One owner login, protected by a password.

Built with Next.js, Prisma, PostgreSQL and Tailwind CSS.

## Putting it online with Vercel

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account and click **Add New → Project**. Import this repository.
2. Before deploying, open **Environment Variables** and add:
   - `ADMIN_PASSWORD`: the password you'll log in with. Make it strong.
   - `AUTH_SECRET`: a long random string, at least 32 characters. Generate one with `openssl rand -base64 32`, or use a password generator.
   - `NEXT_PUBLIC_CURRENCY` (optional): defaults to `NGN`. Use e.g. `GHS` or `USD` if needed.
3. Click **Deploy**. The first deploy will fail because there's no database yet. That's expected.
4. In the project, open the **Storage** tab → **Create Database** → choose **Neon** (Postgres, free plan) → connect it to the project. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you.
5. Go to **Deployments**, open the latest one and click **Redeploy**. The database tables are created automatically during the build.
6. Open your site, log in with `ADMIN_PASSWORD`, and start adding products.

Every push to the main branch redeploys automatically.

## Using it

1. **Stock → New product.** Create each model once, e.g. "Samsung Galaxy A15 128GB Blue", with its selling price.
2. **Add phones** on the product page: scan or type IMEIs one per line (dial `*#06#` on a phone to see its IMEI) and enter what you paid.
3. **Sell.** Scan the IMEI (a USB barcode scanner works, it types the number and presses Enter) or search by name, then **Complete sale**.

## Running it on your own computer (for developers)

```bash
cp .env.example .env      # then fill in the values
npm install
npx prisma migrate dev    # create the database tables
npm run dev               # http://localhost:3000
```

Optional: `SHOP_TIMEZONE` (default `Africa/Lagos`) decides when "today" starts on the dashboard.
