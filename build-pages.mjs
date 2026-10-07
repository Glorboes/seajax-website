import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const output = 'docs';
const content = JSON.parse(read('src/default-content.json'));

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

let html = read('src/template.html')
  .replace(/\{\{(text_\d+)\}\}/g, (_, key) => escapeHtml(content.text[key]))
  .replace('{{UNIT_PHOTOS}}', JSON.stringify(content.photos).replaceAll('"/', '"./'))
  .replaceAll('href="/style.css"', 'href="./style.css?v=12"')
  .replaceAll('src="/app.js"', 'src="./app.js?v=12"')
  .replaceAll('src="/hero.png"', 'src="./hero.png"')
  .replaceAll('src="/photos/', 'src="./photos/');

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(`${output}/photos`, { recursive: true });
for (const name of ['app.js', 'blouberg-waves.mp4', 'blouberg-booking.mp4', 'table-mountain-waves.mp4', 'hero.png', 'style.css']) {
  fs.copyFileSync(`public/${name}`, `${output}/${name}`);
}
for (const name of fs.readdirSync('public/photos')) {
  if (name.endsWith('.webp')) fs.copyFileSync(`public/photos/${name}`, `${output}/photos/${name}`);
}
fs.writeFileSync(`${output}/index.html`, html);
fs.writeFileSync(`${output}/404.html`, html);
fs.writeFileSync(`${output}/.nojekyll`, '');

console.log('GitHub Pages website built in docs/.');
