# Zionshop

Inventory and sales for a single phone shop.

- **Phones** are tracked one by one by IMEI (new, used or refurbished), each with its own cost price.
- **Accessories** (chargers, cases, screen guards…) are tracked by quantity.
- **Sell** screen: scan or type an IMEI, or search by model, adjust the price if you agreed a discount, pick cash / transfer / card, and print a receipt.
- **Dashboard**: today's sales and profit, last 30 days, stock value, and items running low.
- **Sales history** with profit per sale. A sale entered by mistake can be cancelled, which puts the items back into stock.
- **English and French**: switch with the EN / FR button (it starts in French if the browser is set to French).
- **Light and dark mode**: follows the device by default; the button next to EN / FR switches it.
- One owner account with a username and password, plus optional two-step verification (see **Security** below).

Built with Next.js, Prisma, PostgreSQL and Tailwind CSS.

## Putting it online with Vercel

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account and click **Add New → Project**. Import this repository.
2. Before deploying, open **Environment Variables** and add:
   - `ADMIN_USERNAME`: the username you'll sign in with, e.g. `zion`.
   - `ADMIN_PASSWORD`: a temporary password for the first sign-in (12+ characters).
   - `AUTH_SECRET`: a long random string, at least 32 characters. Generate one with `openssl rand -base64 32`, or use a password generator. Never change it later.
   - `NEXT_PUBLIC_CURRENCY` (optional): defaults to `NGN`. Use e.g. `XOF`, `GHS` or `USD` if needed.
3. Click **Deploy**. The first deploy will fail because there's no database yet. That's expected.
4. In the project, open the **Storage** tab → **Create Database** → choose **Neon** (Postgres, free plan) → connect it to the project. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you.
5. Go to **Deployments**, open the latest one and click **Redeploy**. The database tables are created automatically during the build.
6. Open your site and sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`. This first sign-in creates your account.
7. Go to **Settings**: change your password, then turn on **two-step verification**.
8. Back in Vercel, delete the `ADMIN_PASSWORD` variable. It's no longer used, and it's better not to leave it there.

Every push to the main branch redeploys automatically.

## Using it

1. **Stock → New product.** Create each model once, e.g. "Samsung Galaxy A15 128GB Blue", with its selling price.
2. **Add phones** on the product page: scan or type IMEIs one per line (dial `*#06#` on a phone to see its IMEI) and enter what you paid.
3. **Sell.** Scan the IMEI (a USB barcode scanner works, it types the number and presses Enter) or search by name, then **Complete sale**.

## Security

- Passwords are stored only as scrypt hashes (a slow, salted, one-way function). Nobody, including whoever runs the database, can read them back.
- **Two-step verification** (Settings): after your password, sign-in also asks for a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…). Each code works only once. The app's secret key is stored encrypted.
- **Brute-force protection**: after 5 wrong attempts from one device, sign-in is blocked for 15 minutes. Every attempt is logged, and you can see recent ones in Settings.
- Sessions are random tokens kept in a secure, HTTP-only cookie. They end after 12 hours without use, or 7 days at most. Changing your password signs out every other device, and Settings lets you sign out other devices at any time.
- Every page and every action checks the session on the server.
- Strict browser security headers: a Content Security Policy, no embedding in other sites, HTTPS only (HSTS), no caching of pages, and search engines are told not to index anything.

**Locked out?** (forgotten password or lost phone) Someone with access to the database can reset the account from a computer:

```bash
DATABASE_URL="<from Vercel → Storage → Neon>" npm run reset-owner -- <username> <new-password>
```

This sets the new password, turns off two-step verification and signs out every device.

## Running it on your own computer (for developers)

```bash
cp .env.example .env      # then fill in the values
npm install
npx prisma migrate dev    # create the database tables
npm run dev               # http://localhost:3000
```

Optional: `SHOP_TIMEZONE` (default `Africa/Lagos`) decides when "today" starts on the dashboard.
