/* tests/i18n.test.js · Checks, without a browser, that the translations are complete, consistent and safe.
   Usage (from the project folder):   node tests/i18n.test.js
   It goes through every language in locales/languages.json, so a new language is checked as soon as it is added.

   It requires that:
     · every language listed has its locales/<code>.json and every .json in locales/ is listed;
     · every language has exactly the keys of English (the reference language): none missing, none extra;
     · every text uses the same {parameters} as the English one, plurals have the "other" form, nothing is empty;
     · the texts only use the tags <b> and <small> (anything else would be escaped and shown as text);
     · every key used by the app (data-i18n in index.html, tr('…')/trh('…') in the code, and the families built by
       code such as color.*, dir.*, layer.*, stage.*, lesson.*) exists in English;
     · sw.js lists every language file, so the app also works offline;
     · the module works: loads, picks plurals and escapes any markup that isn't allowed. */
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
let errors=0;
const fail=msg=>{errors++;if(errors<=30)console.log('  ✗ '+msg);};
const parse=f=>{try{return JSON.parse(read(f));}catch(e){fail(f+' is not valid JSON: '+e.message);return {};}};

// ---- the files ----
const names=parse('locales/languages.json');
const codes=Object.keys(names);
const REF='en';
if(!codes.includes(REF))fail('locales/languages.json does not list the reference language ('+REF+')');
const tables={};
for(const c of codes){
  if(!fs.existsSync(path.join(dir,'locales',c+'.json'))){fail('locales/'+c+'.json is listed but does not exist');continue;}
  tables[c]=parse('locales/'+c+'.json');
}
for(const f of fs.readdirSync(path.join(dir,'locales')))
  if(f.endsWith('.json')&&f!=='languages.json'&&!codes.includes(f.slice(0,-5)))fail('locales/'+f+' exists but is not listed in languages.json');
const ref=tables[REF]||{};

// ---- same keys, same parameters, allowed tags ----
const forms=v=>typeof v==='object'&&v?Object.values(v):[v];
const params=v=>[...new Set(forms(v).flatMap(s=>String(s).match(/\{(\w+)\}/g)||[]))].sort().join(',');
for(const c of codes){
  const s=tables[c];if(!s)continue;
  for(const k of Object.keys(ref))if(!(k in s))fail(c+': missing key '+k);
  for(const [k,v] of Object.entries(s)){
    if(!(k in ref)){fail(c+': extra key '+k+' (it does not exist in English)');continue;}
    if(params(v)!==params(ref[k]))fail(c+': '+k+' uses parameters ['+params(v)+'] and English uses ['+params(ref[k])+']');
    if((typeof v==='object')!==(typeof ref[k]==='object'))fail(c+': '+k+' is a plural in one language and a plain text in the other');
    if(typeof v==='object'&&!('other' in v))fail(c+': '+k+' has plural forms but no "other"');
    for(const x of forms(v)){
      if(typeof x!=='string'||!x.trim())fail(c+': '+k+' is empty or not a text');
      else for(const m of x.matchAll(/<\/?([a-z0-9]+)[^>]*>/gi))if(!['b','small'].includes(m[1].toLowerCase()))fail(c+': '+k+' uses the tag <'+m[1]+'>, only <b> and <small> are allowed');
    }
  }
}

// ---- every key the app uses exists ----
const used=new Set();
const html=read('index.html');
for(const m of html.matchAll(/data-i18n(?:-html)?="([\w.]+)"/g))used.add(m[1]);
for(const m of html.matchAll(/data-i18n-attr="([^"]+)"/g))for(const p of m[1].split(','))used.add(p.split(':')[1].trim());
const js=['game_controller.js','coach.js','cube_logic.js'].map(read).join('\n');
for(const m of js.matchAll(/\btrh?\(\s*'([\w.]+)'(?!\s*\+)/g))used.add(m[1]);
const CUBE=new Function(read('cube_logic.js')+';return CUBE;')();
const COACH=new Function(read('cube_logic.js')+'\n'+read('algorithms.js')+'\n'+read('coach.js')+';return COACH;')();
for(const f of 'UDFBRL')for(const fam of ['color','dir','layer'])used.add(fam+'.'+f);
for(const st of CUBE.STAGES)used.add('stage.'+st.id);
for(const l of Object.keys(COACH.LESSONS))for(const s of ['','.title','.done','.complete','.free'])used.add('lesson.'+l+s);
for(const k of ['idle','scrambling','ready','running','paused','done'])used.add('challenge.'+k);
for(const n of [1,2,3])used.add('level.'+n);
for(const k of used)if(!(k in ref))fail('the app uses the key '+k+' and it does not exist in English');
for(const m of js.matchAll(/\btrh?\(\s*'([\w.]+)'\s*\+/g))if(!Object.keys(ref).some(k=>k.startsWith(m[1])))fail('the prefix '+m[1]+' does not match any key');

// ---- the service worker keeps every file ----
const sw=read('sw.js');
for(const f of ['locales/languages.json',...codes.map(c=>'locales/'+c+'.json'),'styles.css','i18n.js','graphics_engine.js','cube_logic.js','algorithms.js','coach.js','game_controller.js'])
  if(!sw.includes("'./"+f+"'"))fail('sw.js does not list ./'+f);

// ---- the module works (with fetch reading the files, plus a fake language to test escaping) ----
const fake={'locales/languages.json':JSON.stringify(Object.assign({},names,{zz:'Test'})),
  'locales/zz.json':JSON.stringify(Object.assign({},ref,{'msg.wrong':'<img src=x onerror=alert(1)><b>ok</b>"'}))};
const fetchStub=url=>Promise.resolve(fake[url]?{ok:true,json:()=>Promise.resolve(JSON.parse(fake[url]))}
  :fs.existsSync(path.join(dir,url))?{ok:true,json:()=>Promise.resolve(JSON.parse(read(url)))}:{ok:false,status:404});
const doc={documentElement:{},querySelectorAll:()=>[]};
const I18N=new Function('fetch','document','localStorage','navigator',read('i18n.js')+';return I18N;')(
  fetchStub,doc,{getItem(){return null;},setItem(){}},{languages:['es-CO','en']});
(async()=>{
  await I18N.init();
  if(I18N.language()!=='es'&&codes.includes('es'))fail('the module did not pick the browser language (es-CO → es)');
  await I18N.use('en');
  if(I18N.t('practice.done',{n:1})!=='1 exercise done'||I18N.t('practice.done',{n:2})!=='2 exercises done')fail('English plurals do not work');
  await I18N.use('zz');
  const out=I18N.html('msg.wrong');
  if(out.includes('<img')||!out.includes('<b>ok</b>')||!out.includes('&lt;img'))fail('html() does not escape forbidden markup: '+out);
  if(I18N.t('msg.wrong').includes('&lt;'))fail('t() should give plain text, not escaped text');
  let failed=false;await I18N.use('missing-language').catch(()=>{failed=true;});
  if(I18N.language()!=='en'&&!failed)fail('an unknown language should fall back to English');

  console.log((errors?'✗':'✓')+' '+codes.length+' languages ('+codes.join(', ')+'), '+Object.keys(ref).length+' keys, '+used.size+' keys in use');
  console.log(errors?'\n'+errors+' errors':'\nAll good');
  process.exit(errors?1:0);
})().catch(e=>{console.log('  ✗ the module failed: '+e.message);process.exit(1);});
