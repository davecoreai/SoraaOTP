# Sora OTP — Vercel + NokosPusat + Midtrans

Frontend HTML/CSS/JS and Vercel serverless API for a virtual-number/OTP dashboard.

## Features included
- Landing page, login, registration, dashboard, order, topup, profile.
- Responsive dark liquid-glass UI.
- Bottom navigation Home / Order / Topup / Profile with draggable glass lens and icon zoom.
- SweetAlert2 confirmation and "Saldo Tidak Cukup" popup.
- PostgreSQL-backed users, wallets, ledger, topups, orders.
- Email/password and Google authentication through Supabase Auth, exchanged for an HttpOnly app session cookie.
- Google OAuth through Supabase Auth with a callback page and server-side token verification.
- NokosPusat services, countries, offers, create-order and OTP status integration.
- Midtrans Snap payment creation and signature-verified notification webhook.
- Minimum topup Rp10.000.
- Provider 1, Provider 2, Provider 3; prices are fetched from NokosPusat offers rather than invented.

## Deploy to Vercel
1. Create a Neon PostgreSQL database.
2. Run `database/schema.sql` in the Neon SQL Editor.
3. Push this project to a Git repository and import it into Vercel.
4. In Vercel Project Settings → Environment Variables, configure:
   - `DATABASE_URL`
   - `SUPABASE_URL` (Supabase Project URL)
   - `SUPABASE_ANON_KEY` (publishable/anon key only; never service_role)
   - `JWT_SECRET` (random secret, at least 32 characters)
   - `NOKOS_API_KEY`
   - `NOKOS_BASE_URL=https://nokospusat.com`
   - `MIDTRANS_SERVER_KEY`
   - `MIDTRANS_CLIENT_KEY`
   - `MIDTRANS_IS_PRODUCTION=false` while testing
   - `APP_URL=https://your-project.vercel.app`
   - optionally `PRICE_MARKUP_IDR=0`
5. Redeploy after adding environment variables.
6. In Midtrans Dashboard, set Payment Notification URL to:
   `https://your-project.vercel.app/api/midtrans/notification`
7. Test with Midtrans Sandbox first, then switch keys and `MIDTRANS_IS_PRODUCTION=true` for production.

## Google OAuth with Supabase
1. In Supabase Authentication → Sign In / Providers, enable Google and paste the Google OAuth Client ID and Client Secret.
2. Copy the callback URL shown by Supabase and paste it into Google Cloud → Authorized redirect URIs. It usually looks like `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
3. In Google Cloud → Authorized JavaScript origins, add `https://soraotp.vercel.app` (or your actual deployed origin).
4. In Supabase Authentication → URL Configuration, set Site URL to `https://soraotp.vercel.app` and add `https://soraotp.vercel.app/**` to Redirect URLs.
5. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel, then redeploy. The browser only receives the public anon/publishable key.
6. The callback at `/auth-callback.html` exchanges the verified Supabase access token for the app session cookie. The project still needs the Neon database configured for wallets/orders/topups. Email/password accounts must be created through the registration page so Supabase is the source of authentication.

## Local development
Requires Node.js 20+ and Vercel CLI:
```bash
npm install
npx vercel dev
```
Create `.env.local` using `.env.example` values. Localhost cookie security may require HTTPS or Vercel dev behavior; production cookie is Secure.

## API routes
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (session data, wallet, recent orders and topups)
- `DELETE /api/auth/me` (logout)
- `GET /api/catalog/services`
- `GET /api/catalog/countries?service=SERVICE_ID&provider=provider_1`
- `GET /api/catalog/offers?service=SERVICE_ID&provider=provider_1&country=indonesia`
- `POST /api/orders/create`
- `GET /api/orders/:id`
- `POST /api/topup/create`
- `POST /api/midtrans/notification`

## Important notes before real-money production
- This project requires valid NokosPusat and Midtrans credentials; keys are not included.
- Google login requires Supabase Google provider credentials and `SUPABASE_URL` / `SUPABASE_ANON_KEY` environment variables.
- Use HTTPS and set `APP_URL` to the deployed origin.
- Set `MIDTRANS_IS_PRODUCTION=false` and use sandbox keys until end-to-end tests pass.
- NokosPusat upstream API balance must also be funded independently from customers' Sora OTP wallet balance.
- The order API deducts the displayed quoted price plus `PRICE_MARKUP_IDR` from the user's wallet; the upstream order is submitted at the exact NokosPusat quoted price.
- For a robust production rollout, add rate limiting, email verification, password reset, admin operations/refund review, monitoring, and automated integration tests.
- If NokosPusat returns an allocation-uncertain error, inspect the upstream workspace before retrying a purchase.
# SoraaOTP
