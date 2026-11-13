/* tests/i18n.test.js · Checks, without a browser, that the languages are complete and consistent.
   Usage (from the project folder):   node tests/i18n.test.js
   It goes through every file in i18n/ (except i18n.js), so a new language is checked as soon as it is added.

   It requires that:
     · every language has exactly the keys of English (the reference language): none missing, none extra;
     · every text uses the same {parameters} as the English one, and plurals have the "other" form;
     · every key used by the app (data-i18n in index.html, tr('…') in the code, and the families built by code such as
       color.*, dir.*, layer.*, stage.*, lesson.*) exists in English;
     · every language file is loaded by index.html and listed in sw.js (otherwise it would not work, or not offline). */
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
let errors=0;
const fail=msg=>{errors++;if(errors<=30)console.log('  ✗ '+msg);};

// ---- load the module and every language ----
const files=fs.readdirSync(path.join(dir,'i18n')).filter(f=>f.endsWith('.js')&&f!=='i18n.js').sort();
const code=read('i18n/i18n.js')+'\n'+files.map(f=>read('i18n/'+f)).join('\n')+';return I18N;';
const I18N=new Function('document','localStorage','navigator',code)({documentElement:{},querySelectorAll:()=>[]},{getItem(){return null;},setItem(){}},{languages:['en']});
const codes=I18N.list().map(l=>l.code);
if(!codes.includes(I18N.REFERENCE))fail('the reference language ('+I18N.REFERENCE+') is missing');
const ref=I18N.strings(I18N.REFERENCE)||{};
const params=v=>{const all=typeof v==='object'?Object.values(v):[v];return [...new Set(all.flatMap(s=>(s.match(/\{(\w+)\}/g)||[])))].sort().join(',');};

// ---- same keys and same parameters in every language ----
for(const c of codes){
  const s=I18N.strings(c);
  for(const k of Object.keys(ref))if(!(k in s))fail(c+': missing key '+k);
  for(const k of Object.keys(s)){
    if(!(k in ref)){fail(c+': extra key '+k+' (it does not exist in English)');continue;}
    if(params(s[k])!==params(ref[k]))fail(c+': '+k+' uses parameters ['+params(s[k])+'] and English uses ['+params(ref[k])+']');
    if(typeof s[k]==='object'&&!('other' in s[k]))fail(c+': '+k+' has plural forms but no "other"');
    if(typeof s[k]==='object'!==(typeof ref[k]==='object'))fail(c+': '+k+' is a plural in one language and a plain text in the other');
    if(!(typeof s[k]==='object'?Object.values(s[k]).every(x=>x&&x.trim()):s[k]&&s[k].trim()))fail(c+': '+k+' is empty');
  }
}

// ---- every key the app uses exists ----
const used=new Set();
const html=read('index.html');
for(const m of html.matchAll(/data-i18n(?:-html)?="([\w.]+)"/g))used.add(m[1]);
for(const m of html.matchAll(/data-i18n-attr="([^"]+)"/g))for(const p of m[1].split(','))used.add(p.split(':')[1].trim());
const js=['game_controller.js','coach.js','cube_logic.js'].map(read).join('\n');
for(const m of js.matchAll(/\btr\(\s*'([\w.]+)'(?!\s*\+)/g))used.add(m[1]);
// families of keys built by code
const faces='UDFBRL'.split('');
const CUBE=new Function(read('cube_logic.js')+';return CUBE;')();
const COACH=new Function(read('cube_logic.js')+read('algorithms.js')+read('coach.js')+';return COACH;')();
for(const f of faces)for(const fam of ['color','dir','layer'])used.add(fam+'.'+f);
for(const st of CUBE.STAGES)used.add('stage.'+st.id);
for(const l of Object.keys(COACH.LESSONS))for(const s of ['','.title','.done','.complete','.free'])used.add('lesson.'+l+s);
for(const k of ['challenge.idle','challenge.scrambling','challenge.ready','challenge.running','challenge.paused','challenge.done'])used.add(k);
for(const n of [1,2,3])used.add('level.'+n);
for(const k of used)if(!(k in ref))fail('the app uses the key '+k+' and it does not exist in English');
// the keys that are built by code with a prefix: every literal prefix must lead to at least one key
for(const m of js.matchAll(/\btr\(\s*'([\w.]+)'\s*\+/g))if(!Object.keys(ref).some(k=>k.startsWith(m[1])))fail('the prefix '+m[1]+' does not match any key');

// ---- every language file is loaded and cached ----
const sw=read('sw.js');
for(const f of files){
  if(!html.includes('src="i18n/'+f+'"'))fail('index.html does not load i18n/'+f);
  if(!sw.includes("'./i18n/"+f+"'"))fail('sw.js does not list ./i18n/'+f);
}
for(const f of ['index.html','styles.css','graphics_engine.js','cube_logic.js','algorithms.js','coach.js','game_controller.js','i18n/i18n.js'])
  if(!sw.includes("'./"+f+"'")&&f!=='index.html')fail('sw.js does not list ./'+f);

// ---- plurals work ----
const t=I18N.t;
I18N.use('en');
if(t('practice.done',{n:1})!=='1 exercise done'||t('practice.done',{n:2})!=='2 exercises done')fail('English plurals do not work');

console.log((errors?'✗':'✓')+' '+codes.length+' languages ('+codes.join(', ')+'), '+Object.keys(ref).length+' keys, '+used.size+' keys in use');
console.log(errors?'\n'+errors+' errors':'\nAll good');
process.exit(errors?1:0);
