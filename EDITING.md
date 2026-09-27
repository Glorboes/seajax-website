# Editing Seajax

Open `/admin` on the website and sign in with the owner's ChatGPT account.

- **Page text:** open a section and edit its fields.
- **Unit photos:** upload JPEG, PNG or WebP files; move photos with the arrows or remove them. The first image is the cover. Uploads are resized for fast loading.
- **Save draft:** stores changes online without changing the visitor website.
- **Preview draft:** saves your changes and opens a private preview.
- **Publish changes:** makes the saved draft visible on the website immediately.
- **Discard draft:** returns the draft to the currently published content.

The editor uses server-side account checks. `EDITOR_EMAIL` is the allowed owner email in Sites runtime settings; do not put it in browser files. Drafts and published content are stored together as an R2 JSON document with conditional writes to prevent silent overwrites from concurrent editors. Photos are stored in R2. Publishing content does not require a code deployment.

Code maintenance: run `node build.mjs` to package the Worker and assets. Future code deployments preserve saved content in R2; changing default-content.json affects only a site with no stored content. Original photos remain available to existing published drafts after they are removed from a new draft.
