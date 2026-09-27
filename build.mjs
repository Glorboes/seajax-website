import fs from 'node:fs';
const read = path => fs.readFileSync(path,'utf8');
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/client',{recursive:true});
// Keep all source files in src/, public/ and editor/. The Worker renders the homepage.
fs.cpSync('public','dist/client',{recursive:true});
const files={};
for(const [url,path,type] of [['/style.css','public/style.css','text/css'],['/app.js','public/app.js','text/javascript'],['/admin.html','editor/admin.html','text/html'],['/editor.css','editor/editor.css','text/css'],['/editor.js','editor/editor.js','text/javascript']])files[url]={body:read(path),type};
const generated={template:read('src/template.html'),defaults:JSON.parse(read('src/default-content.json')),fields:JSON.parse(read('src/fields.json')),files};
fs.writeFileSync('dist/server/generated.mjs',Object.entries(generated).map(([key,value])=>'export const '+key+' = '+JSON.stringify(value)+';').join('\n'));
fs.copyFileSync('src/worker.mjs','dist/server/index.js');
fs.writeFileSync('dist/server/package.json','{"type":"module"}\n');
// Remove obsolete static entrypoints so authenticated/dynamic routes always reach the Worker.
for(const name of fs.readdirSync('dist'))if(!['server','client','.openai'].includes(name))fs.rmSync('dist/'+name,{recursive:true,force:true});
console.log('Worker and public assets built.');
