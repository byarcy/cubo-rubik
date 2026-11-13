/* i18n.js · Language module: loads the translations and hands out the texts by key.
   It has no texts of its own (except the fallback message for when no language can be loaded) and knows nothing
   about the cube. Exposes a single global object: I18N.

   The translations are plain JSON files in locales/ (data only, never code):
     locales/languages.json   which languages exist: {"en":"English","es":"Español",…}
     locales/<code>.json      the texts of one language: {"key":"text",…}
   English (en) is the reference language: if another language lacks a key, the English text is shown.
   How to add a language: see the README ("Adding a language"); node tests/i18n.test.js checks it.

   Texts: each key is a text or, for plurals, an object with the forms of the language ({"one":…,"other":…}) that is
   chosen with the n parameter. {parameters} are replaced.
   Safety: a translation can only use <b> and <small>. t() gives plain text (for textContent and attributes);
   html() gives markup where everything except those two tags is escaped, so a translation can never inject code. */
const I18N=(function(){
const REFERENCE='en',STORAGE_KEY='cuboRubik.byarcy.lang',DIR='locales/';
// The only texts that live in code: shown when the translations themselves can't be loaded
const FALLBACK={
  load:"Couldn't load the app's texts. Check your connection and reload the page.",
  generic:'An error occurred: {msg} · Reload the page.'
};
let names={},current=REFERENCE,ready=false;
const tables={},listeners=[],pluralRules={};

const getJSON=url=>fetch(url).then(r=>{if(!r.ok)throw new Error(url+' '+r.status);return r.json();});
function loadLanguage(code){
  return tables[code]?Promise.resolve():getJSON(DIR+code+'.json').then(s=>{tables[code]=s;});
}

// ---- Escaping: only <b>, </b>, <small> and </small> survive in a translated text ----
const ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const escape=s=>String(s).replace(/[&<>"']/g,c=>ESC[c]);
const ALLOWED=/&lt;(\/?)(b|small)&gt;/g;

function lookup(key){
  const a=tables[current],r=tables[REFERENCE];
  if(a&&key in a)return a[key];
  if(r&&key in r)return r[key];
  return null;
}
// The raw text of a key (the right plural form if it has them); the key itself if it doesn't exist
function raw(key,params){
  let v=lookup(key);
  if(v==null)return key;
  if(typeof v==='object'){
    const rules=pluralRules[current]||(pluralRules[current]=new Intl.PluralRules(current));
    v=v[rules.select(params&&params.n)]||v.other||'';
  }
  return String(v);
}
const fill=(s,params)=>s.replace(/\{(\w+)\}/g,(m,k)=>params&&k in params?params[k]:m);
// Plain text, for textContent and attributes (any < or > in it is shown as is)
const t=(key,params)=>fill(raw(key,params),params);
// Markup, for innerHTML: the translation is escaped except <b> and <small>.
// The params are inserted as they come: whoever builds them must escape any translated part with I18N.escape().
const html=(key,params)=>fill(escape(raw(key,params)).replace(ALLOWED,'<$1$2>'),params);

// Puts the texts on the page: data-i18n (text), data-i18n-html (with <b>…) and data-i18n-attr="attribute:key,…"
function apply(root){
  root.querySelectorAll('[data-i18n]').forEach(e=>{e.textContent=t(e.dataset.i18n);});
  root.querySelectorAll('[data-i18n-html]').forEach(e=>{e.innerHTML=html(e.dataset.i18nHtml);});
  root.querySelectorAll('[data-i18n-attr]').forEach(e=>{
    for(const pair of e.dataset.i18nAttr.split(',')){const [a,k]=pair.split(':');e.setAttribute(a.trim(),t(k.trim()));}
  });
}
// The saved language; if there is none, the first of the browser's languages that exists; otherwise English
function detect(){
  try{const s=localStorage.getItem(STORAGE_KEY);if(s&&names[s])return s;}catch(e){}
  const preferred=(typeof navigator!=='undefined'&&(navigator.languages||[navigator.language]))||[];
  for(const l of preferred){const c=String(l||'').toLowerCase().split('-')[0];if(names[c])return c;}
  return REFERENCE;
}
function set(code,save){
  current=code;
  if(save){try{localStorage.setItem(STORAGE_KEY,code);}catch(e){}}
  document.documentElement.lang=code;
  apply(document);
  listeners.forEach(f=>f(code));
}
// Loads the list of languages, English and the detected language. Resolves when the texts are ready.
function init(){
  return getJSON(DIR+'languages.json').then(list=>{
    names=list;
    const code=detect();
    return Promise.all([loadLanguage(REFERENCE),code===REFERENCE?null:loadLanguage(code).catch(()=>{})])
      .then(()=>{set(tables[code]?code:REFERENCE,false);ready=true;});
  });
}
// Switches language (loading it first if needed); the promise fails if it can't be loaded
function use(code,save){
  if(!names[code])code=REFERENCE;
  return loadLanguage(code).then(()=>set(code,save));
}
const onChange=f=>listeners.push(f);
const list=()=>Object.keys(names).map(code=>({code,name:names[code]}));

// Whether a key exists (in the current language or in English)
const has=key=>lookup(key)!=null;

return {init,use,t,html,escape,apply,detect,list,onChange,has,REFERENCE,FALLBACK,
  language:()=>current,isReady:()=>ready,strings:code=>tables[code]||null};
})();
