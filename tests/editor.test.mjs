import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
class Bucket {
 constructor(){this.objects=new Map();this.version=0;}
 async get(key){const o=this.objects.get(key);return o?{etag:o.etag,json:async()=>JSON.parse(o.body),body:o.body,httpMetadata:o.options.httpMetadata}:null;}
 async put(key,body,options={}){const prev=this.objects.get(key);if(options.onlyIf?.etagMatches&&prev?.etag!==options.onlyIf.etagMatches)return null;if(options.onlyIf?.etagDoesNotMatch==='*'&&prev)return null;const etag=String(++this.version);this.objects.set(key,{body,etag,options});return {etag};}
}
const env={EDITOR_EMAIL:'owner@example.test',BUCKET:new Bucket(),ASSETS:{fetch:async()=>new Response('asset')}};
const call=(path,body,identity='owner@example.test',origin='https://site.test')=>worker.fetch(new Request('https://site.test'+path,{method:body?'POST':'GET',headers:{...(identity?{'oai-authenticated-user-id':'verified-id','oai-authenticated-user-email':identity}:{}),...(body?{'Origin':origin,'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
assert.equal((await call('/api/editor/state',null,null)).status,403);
assert.equal((await call('/api/editor/state',null,'visitor@example.test')).status,403);
assert.equal((await call('/admin',null,null)).status,302);
let state=await (await call('/api/editor/state')).json();assert.equal(state.revision,0);
let draft=structuredClone(state.draft);const heading=Object.keys(draft.text).find(k=>draft.text[k].includes('Unwind by the sea.'));assert.ok(heading);draft.text[heading]='A private draft <script>alert(1)</script>';
assert.equal((await call('/api/editor/draft',{revision:0,content:draft},'owner@example.test','https://evil.test')).status,403);
assert.equal((await call('/api/editor/draft',{revision:0,content:draft})).status,200);
assert.ok(!(await (await call('/')).text()).includes('A private draft'));
assert.ok((await (await call('/admin/preview')).text()).includes('&lt;script&gt;'));
assert.equal((await call('/api/editor/draft',{revision:0,content:draft})).status,409);
assert.equal((await call('/api/editor/publish',{revision:1})).status,200);
assert.ok((await (await call('/')).text()).includes('A private draft &lt;script&gt;'));
state=await (await call('/api/editor/state')).json();assert.equal(state.revision,2);assert.ok(state.publishedAt);
const invalid=structuredClone(draft);invalid.photos.pearl=[];assert.equal((await call('/api/editor/draft',{revision:2,content:invalid})).status,400);
const attack=structuredClone(draft);attack.photos.pearl[0].src='javascript:alert(1)';assert.equal((await call('/api/editor/draft',{revision:2,content:attack})).status,400);
const removed=structuredClone(draft);removed.photos.pearl=removed.photos.pearl.slice(1);assert.equal((await call('/api/editor/draft',{revision:2,content:removed})).status,200);
assert.equal((await call('/api/editor/reset',{revision:3})).status,200);state=await (await call('/api/editor/state')).json();assert.equal(state.draft.photos.pearl.length,draft.photos.pearl.length);
const unauthUpload=await worker.fetch(new Request('https://site.test/api/editor/upload',{method:'POST',body:'fake'}),env);assert.equal(unauthUpload.status,403);
console.log('PASS: owner-only access, CSRF protection, durable draft reads, publish isolation, escaped text, stale-write rejection, photo validation and discard.');
