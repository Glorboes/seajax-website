# Seajax website

Modern website redesign for Seajax self-catering accommodation in Blouberg, Cape Town.

## Review the website

- [Live website preview](https://seajax-coastal-stays.wxzpdsh88y.chatgpt.site)
- [Private content editor](https://seajax-coastal-stays.wxzpdsh88y.chatgpt.site/admin) — access is restricted to the authorised owner account

The website includes four unit-specific photo slideshows, Airbnb and Booking.com links, an embedded Google Map, responsive mobile layouts, and a private editor for changing text and unit photos.

## Editing content

The private editor supports saved drafts, previews, photo uploads and publishing. See [EDITING.md](EDITING.md) for the editing workflow.

## Local development

The site is a Cloudflare-compatible JavaScript Worker with static assets and R2-backed content storage.

1. Use Node.js 20 or newer.
2. Run `node build.mjs` to produce the deployable files in `dist/`.
3. Run `node tests/editor.test.mjs` to verify editor access, drafts and publishing.
4. Run `node preview.mjs` to open a local preview at `http://127.0.0.1:4173`.

The production editor requires the `EDITOR_EMAIL` runtime secret and the `BUCKET` R2 binding defined in `.openai/hosting.json`. Do not commit real credentials or local environment files.

## Project structure

- `src/` — website template, initial content and Worker code
- `public/` — website styles, scripts and images
- `editor/` — private editor interface
- `tests/` — editor and publishing checks
- `build.mjs` — creates the deployable Worker bundle

