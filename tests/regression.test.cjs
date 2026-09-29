const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const app = read('js/app.js');
const fn = name => app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0];

test('highlight overlapping terms once without modifying tags or trusting HTML', () => {
  const context = { HIGHLIGHT_TERMS: ['arm', 'a', 'arm'] };
  vm.createContext(context); vm.runInContext(fn('esc') + '\n' + fn('markTerms'), context);
  assert.equal(context.markTerms('arm pain'), '<mark>arm</mark> p<mark>a</mark>in');
  context.HIGHLIGHT_TERMS = ['a+b', '<'];
  assert.equal(context.markTerms('<a+b>'), '<mark>&lt;</mark><mark>a+b</mark>&gt;');
  context.HIGHLIGHT_TERMS = [];
  assert.equal(context.markTerms('<img>'), '&lt;img&gt;');
});
test('explicit and deep-link languages override saved language', () => {
  const context = { URLSearchParams, LANG_KEY: 'mtm_lang', navigator: {language: 'ko'},
    localStorage: {getItem: () => 'ko', setItem() {}}, location: {search: '?lang=en', pathname: '/'} };
  vm.createContext(context); vm.runInContext(fn('detectLang'), context);
  assert.equal(context.detectLang(), 'en');
  context.location = {search: '', pathname: '/en/condition/knee-oa/'};
  assert.equal(context.detectLang(), 'en');
  context.location = {search: '?lang=ko', pathname: '/en/condition/knee-oa/'};
  assert.equal(context.detectLang(), 'ko');
});
test('offline deep address routes to the requested disease, and root assets resolve', () => {
  let rendered;
  const context = { location: {pathname:'/condition/knee-oa/',hash:''}, window: {scrollTo(){}},
    applyChrome(){},renderCondition(id){rendered=id},CONDITIONS:[],setMeta(){} };
  vm.createContext(context);vm.runInContext(fn('route'),context);context.route();
  assert.equal(rendered,'knee-oa');
  for(const m of read('index.html').matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^(?:https?:|\/)/.test(m[1])) continue;
    assert.fail(`Relative asset: ${m[1]}`);
  }
});
test('all generated interactive links preserve the document language', () => {
  for (const [dir, lang] of [['condition','ko'],['en/condition','en']]) {
    for (const id of fs.readdirSync(path.join(root,dir))) {
      assert.ok(read(`${dir}/${id}/index.html`).includes(`href="/?lang=${lang}#/condition/${id}"`));
    }
  }
});
test('offline navigation falls back to the cached shell; unrelated caches survive activation', async () => {
  const handlers={};let result; const deleted=[];
  const shell = new Response('shell');
  const context = { URL,Response,fetch:async()=>{throw Error('offline')},
    self:{location:{origin:'https://guide.test'},addEventListener:(n,f)=>handlers[n]=f,clients:{claim(){} }},
    caches:{open:async()=>({match:async key=>key==='/index.html'?shell:undefined}),keys:async()=>['mtm-v8','other-app'],delete:async key=>deleted.push(key)} };
  vm.runInNewContext(read('sw.js'),context);
  let activation;handlers.activate({waitUntil:p=>activation=p});await activation;
  assert.deepEqual(deleted,['mtm-v8']);
  handlers.fetch({request:{url:'https://guide.test/condition/knee-oa/',method:'GET',mode:'navigate'},waitUntil(){},respondWith:p=>result=p});
  assert.equal(await (await result).text(),'shell');
});
