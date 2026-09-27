import { template, defaults, fields, files } from './generated.mjs';
const KEY = 'editor/content-v1.json';
const units = ['pearl','coral','swell','kelp'];
const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function authorized(request, env) {
 return !!env.EDITOR_EMAIL && !!request.headers.get('oai-authenticated-user-id') && request.headers.get('oai-authenticated-user-email')?.toLowerCase() === env.EDITOR_EMAIL.toLowerCase();
}
async function state(env) {
 if (!env.BUCKET) throw new Error('Storage is unavailable');
 const object=await env.BUCKET.get(KEY);
 return object ? {value:await object.json(),etag:object.etag} : {value:{revision:0,draft:defaults,published:defaults,publishedAt:null},etag:null};
}
function valid(content) {
 if (!content || typeof content.text !== 'object' || !content.photos) return false;
 if (Object.keys(content.text).length !== fields.length) return false;
 if (!fields.every(f=> typeof content.text[f.key]==='string' && content.text[f.key].length<=3000 && content.text[f.key].trim().length>0)) return false;
 return units.every(unit=>Array.isArray(content.photos[unit]) && content.photos[unit].length>0 && content.photos[unit].length<=100 && content.photos[unit].every(photo=>photo && typeof photo.alt==='string' && photo.alt.length<=300 && typeof photo.src==='string' && (/^\/photos\/[a-z]+-\d+\.webp$/.test(photo.src) && defaults.photos[unit].some(p=>p.src===photo.src) || /^\/media\/[a-f0-9-]{36}\.(webp|jpg|png)$/.test(photo.src))));
}
function render(content) {
 let html=template.replace(/\{\{(text_\d+)\}\}/g,(_,key)=>escape(content.text[key] ?? defaults.text[key]));
 html=html.replace('{{UNIT_PHOTOS}}',JSON.stringify(content.photos).replace(/</g,'\\u003c'));
 for (const unit of units) {
  const photo=content.photos[unit][0];
  const pattern=new RegExp('(<div class="unit-slideshow" data-unit="'+unit+'"[\\s\\S]*?<img )src="[^"]*" alt="[^"]*"');
  html=html.replace(pattern,(_,prefix)=>prefix+'src="'+escape(photo.src)+'" alt="'+escape(photo.alt)+'"');
  const count=new RegExp('(data-unit="'+unit+'"[\\s\\S]*?<span class="photo-count"[^>]*>)[^<]*');
  html=html.replace(count,(_,prefix)=>prefix+'1 / '+content.photos[unit].length);
 }
 return html;
}
function htmlResponse(html) {return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"frame-ancestors 'self'"}});}
async function save(env, current, next) {
 const result=await env.BUCKET.put(KEY,JSON.stringify(next),{onlyIf:current.etag?{etagMatches:current.etag}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});
 return !!result;
}
export default {async fetch(request,env) {
 const url=new URL(request.url),path=url.pathname;
 try {
  if (path.startsWith('/admin') || path.startsWith('/api/editor')) {
   if (!authorized(request,env)) {
    if (path.startsWith('/api/')) return json({error:'Sign in with the authorised editor account.'},403);
    if (!request.headers.get('oai-authenticated-user-id')) return Response.redirect(url.origin+'/signin-with-chatgpt?return_to=%2Fadmin',302);
    return htmlResponse('<h1>Editor access is restricted</h1><p>Please sign in with the site owner’s account.</p><a href="/signout-with-chatgpt?return_to=%2Fadmin">Switch account</a>');
   }
   if (!['GET','HEAD'].includes(request.method) && request.headers.get('Origin')!==url.origin) return json({error:'This request must come from the site editor.'},403);
   if (path==='/admin' || path==='/admin/') return htmlResponse(files['/admin.html'].body);
   if (path==='/admin/preview') return htmlResponse(render((await state(env)).value.draft));
   if (path==='/api/editor/state' && request.method==='GET') return json({...((await state(env)).value),fields});
   if ((path==='/api/editor/draft' || path==='/api/editor/publish' || path==='/api/editor/reset') && request.method==='POST') {
    if (!(request.headers.get('content-type')||'').startsWith('application/json')) return json({error:'Expected JSON.'},415);
    if (Number(request.headers.get('content-length')||0)>400000) return json({error:'Draft is too large.'},413);
    const raw=await request.text();if(raw.length>400000)return json({error:'Draft is too large.'},413);
    let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
    const current=await state(env),value=current.value;
    if (body.revision!==value.revision) return json({error:'This draft was changed in another window. Reload the editor before saving.'},409);
    let next={...value,revision:value.revision+1};
    if(path.endsWith('/draft')) {
     if(!valid(body.content))return json({error:'Check the text fields and ensure every unit has between 1 and 100 photos.'},400);
     next.draft=body.content;
    } else if(path.endsWith('/publish')) {next.published=value.draft;next.publishedAt=new Date().toISOString();}
    else next.draft=value.published;
    if(!await save(env,current,next))return json({error:'Another change was saved first. Reload before trying again.'},409);
    return json(next);
   }
   if(path==='/api/editor/upload' && request.method==='POST') {
    const type=request.headers.get('content-type');const types={'image/webp':'webp','image/jpeg':'jpg','image/png':'png'};
    if(!types[type])return json({error:'Use a JPEG, PNG or WebP photo.'},415);
    if(Number(request.headers.get('content-length')||0)>3000000)return json({error:'Photo must be smaller than 3 MB.'},413);
    const bytes=new Uint8Array(await request.arrayBuffer());if(bytes.length>3000000||bytes.length<12)return json({error:'Photo must be smaller than 3 MB.'},413);
    const magic=type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
    if(!magic)return json({error:'The file is not a supported photo.'},400);
    const key='media/'+crypto.randomUUID()+'.'+types[type];
    await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:type}});
    return json({src:'/'+key});
   }
   return json({error:'Not found.'},404);
  }
  if (request.method!=='GET' && request.method!=='HEAD')return new Response('Method not allowed',{status:405});
  if(path==='/' || path==='/index.html')return htmlResponse(render((await state(env)).value.published));
  if(/^\/media\/[a-f0-9-]{36}\.(webp|jpg|png)$/.test(path)) {
   const object=await env.BUCKET.get(path.slice(1));if(!object)return new Response('Not found',{status:404});
   return new Response(request.method==='HEAD'?null:object.body,{headers:{'Content-Type':object.httpMetadata.contentType,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
  }
  if(files[path] && path!=='/admin.html')return new Response(files[path].body,{headers:{'Content-Type':files[path].type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
  if(path.startsWith('/photos/') || path==='/hero.png')return env.ASSETS.fetch(request);
  return new Response('Not found',{status:404});
 } catch(error) {console.error('Seajax request failed',error.message);return path.startsWith('/api/')?json({error:'The service is temporarily unavailable. Your changes are still in this editor. Please try again.'},503):new Response('The site is temporarily unavailable. Please try again shortly.',{status:503});}
}};
