/* i18n/i18n.js · Language module: keeps the texts of each language and hands them out by key.
   It has no texts of its own and knows nothing about the cube: each language lives in its own file (en.js, es.js, …)
   and registers itself here. Exposes a single global object: I18N.

   How to add a language (without touching anything else in the logic):
     1. Copy i18n/en.js to i18n/xx.js (xx = language code: pt, fr, de…), change the code and translate.
     2. Add <script src="i18n/xx.js"> to index.html and './i18n/xx.js' to the FILES list of sw.js.
     3. Run  node tests/i18n.test.js  (checks that no key is missing and that the {parameters} match).
   English (en) is the reference language: if another language lacks a key, the English one is shown.

   Texts: each key is a text or, for plurals, an object with the forms of the language ({one:…, other:…}) that is
   chosen with the n parameter. {parameters} are replaced; texts may contain <b> and <small> (they go in with innerHTML). */
const I18N=(function(){
const REFERENCE='en',STORAGE_KEY='cuboRubik.byarcy.lang';
const tables={};let current=REFERENCE;const listeners=[];
const pluralRules={};

function register(code,name,strings){tables[code]={name,strings};}
const list=()=>Object.keys(tables).map(code=>({code,name:tables[code].name}));
const strings=code=>tables[code]?tables[code].strings:null;
const language=()=>current;

function lookup(key){
  const a=tables[current],r=tables[REFERENCE];
  if(a&&key in a.strings)return a.strings[key];
  if(r&&key in r.strings)return r.strings[key];
  return null;
}
// Text of a key with its parameters; if the key doesn't exist the key itself is returned (so it shows on screen)
function t(key,params){
  let v=lookup(key);
  if(v==null)return key;
  if(typeof v==='object'){
    const rules=pluralRules[current]||(pluralRules[current]=new Intl.PluralRules(current));
    v=v[rules.select(params&&params.n)]||v.other||'';
  }
  return v.replace(/\{(\w+)\}/g,(m,k)=>params&&k in params?params[k]:m);
}

// Puts the texts on the page: data-i18n (text), data-i18n-html (with <b>…) and data-i18n-attr="attribute:key,…"
function apply(root){
  root.querySelectorAll('[data-i18n]').forEach(e=>{e.textContent=t(e.dataset.i18n);});
  root.querySelectorAll('[data-i18n-html]').forEach(e=>{e.innerHTML=t(e.dataset.i18nHtml);});
  root.querySelectorAll('[data-i18n-attr]').forEach(e=>{
    for(const pair of e.dataset.i18nAttr.split(',')){const [a,k]=pair.split(':');e.setAttribute(a.trim(),t(k.trim()));}
  });
}
// The saved language; if there is none, the first of the browser's languages that we have; otherwise English
function detect(){
  try{const s=localStorage.getItem(STORAGE_KEY);if(s&&tables[s])return s;}catch(e){}
  const preferred=(typeof navigator!=='undefined'&&(navigator.languages||[navigator.language]))||[];
  for(const l of preferred){const c=String(l||'').toLowerCase().split('-')[0];if(tables[c])return c;}
  return REFERENCE;
}
function use(code,save){
  if(!tables[code])code=REFERENCE;
  current=code;
  if(save){try{localStorage.setItem(STORAGE_KEY,code);}catch(e){}}
  document.documentElement.lang=code;
  apply(document);
  listeners.forEach(f=>f(code));
}
const onChange=f=>listeners.push(f);

return {register,list,strings,language,t,apply,detect,use,onChange,REFERENCE};
})();
