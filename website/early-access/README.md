# Early access backend

The early-access page (`/<lang>/early/`, short link `compresso.izaias.xyz/early`)
posts each signup to a Google Apps Script web app. `Code.gs` stores it in a
Google Sheet and emails the invite from the Gmail account that owns the script,
in the visitor's language, with the steps for the phone they chose.

It costs nothing and needs no server: the site is a static export, the sheet is
the database, and Gmail is the mail service. A personal Google account sends
about 100 emails a day. Past that, rows wait as `pending` and `sendPending()`
sends them the next day.

| Piece | Where |
|---|---|
| Page | `src/components/early/`, styles in `src/app/early.css`, copy under `early` in `src/i18n/*.json` |
| Images and link previews | `scripts/generate-early-assets.mjs` (from the store kit) writes `public/early/` |
| Short link | `/early` in `vercel.json` redirects by `Accept-Language`, English otherwise |
| Signups and invite email | `Code.gs`, pasted into Apps Script |
| Endpoint | `NEXT_PUBLIC_EARLY_ACCESS_URL` in Vercel, the web app's `/exec` URL |

## Set up (once)

1. Sign in to Google as the account the invites should come from.
2. Create a Google Sheet named **Compresso early access**.
3. In the sheet, **Extensions > Apps Script**. Replace the editor's contents
   with `Code.gs` and save.
4. Run `preview` once from the editor and accept the permissions. It emails
   you both versions of the English invite. `preview('pt-BR')` shows another
   language.
5. **Deploy > New deployment > Web app**: Execute as **Me**, Who has access
   **Anyone**. Copy the URL that ends in `/exec`.
6. In Vercel, add `NEXT_PUBLIC_EARLY_ACCESS_URL` with that URL for Production
   and Preview, then redeploy.
7. Optional: **Triggers > Add trigger**, function `sendPending`, time-driven,
   daily, so a busy day's overflow goes out on its own.

The Android steps only work if anyone can join
[compresso-testers](https://groups.google.com/g/compresso-testers): in the
group's settings, **Who can join group** must be **Anyone on the web can join**.

## Change the email

Edit `Code.gs` here first, then paste it into the editor again and use
**Deploy > Manage deployments > Edit > New version**. Editing the existing
deployment keeps the URL, so Vercel needs nothing.

## Sharing

Add `?utm_source=whatsapp` (or `reddit`, and so on) to a shared link and the
sheet's **Source** column records it.
