/* logica_cubo.js · Estado interno del cubo y notación de giros.
   No dibuja nada ni conoce la interfaz: solo piezas, giros y validaciones.
   Expone un único objeto global: CUBO. */
const CUBO=(function(){
// ================= Constantes =================
const FACE_OF={'0,1,0':'U','0,-1,0':'D','0,0,1':'F','0,0,-1':'B','1,0,0':'R','-1,0,0':'L'};
// eje, capa, signo del giro horario visto desde esa cara
const MOVES={R:[0,1,-1],L:[0,-1,1],U:[1,1,-1],D:[1,-1,1],F:[2,1,-1],B:[2,-1,1]};
const OPP={U:'D',D:'U',R:'L',L:'R',F:'B',B:'F'};
const FACE_DIR={U:[0,1,0],D:[0,-1,0],R:[1,0,0],L:[-1,0,0],F:[0,0,1],B:[0,0,-1]};
const key=v=>v.map(x=>(x===0?0:x)).join(',');
const nz=h=>h.filter(v=>v!==0).length;

// ================= Modelo lógico =================
// cube: una entrada por calcomanía. id = pieza a la que pertenece, hn = hacia dónde mira con el cubo armado,
// p = posición actual de la pieza, n = hacia dónde mira ahora, c = color (letra de su cara)
// byId: las calcomanías agrupadas por pieza. size: 3 (3×3) o 2 (2×2, mismo modelo; solo cuentan las esquinas)
let cube=[],byId={},size=3;
function resetLogic(){
  cube=[];byId={};
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
    if(!x&&!y&&!z)continue;
    const p=[x,y,z],id=key(p);
    for(let a=0;a<3;a++){
      if(!p[a])continue;
      const n=[0,0,0];n[a]=p[a];
      const k={id,hn:[...n],p:[...p],n:[...n],c:FACE_OF[key(n)]};
      cube.push(k);(byId[id]=byId[id]||[]).push(k);
    }
  }
}
function rot(v,a,s){
  let r=[...v];const times=s>0?1:3;
  for(let t=0;t<times;t++){const b=(a+1)%3,c=(a+2)%3;const w=[...r];w[b]=-r[c];w[c]=r[b];r=w;}
  return r;
}
// Un cuarto de vuelta de la cara f (dir: 1 horario, -1 antihorario)
function quarter(f,dir){
  const [a,l,s]=MOVES[f];const sg=s*dir;
  for(const k of cube){if(k.p[a]===l){k.p=rot(k.p,a,sg);k.n=rot(k.n,a,sg);}}
}
// 2×2: no hay centros; resuelto = cada cara de un solo color (solo cuentan las esquinas)
function isSolved(){
  if(size===3)return cube.every(k=>k.c===FACE_OF[key(k.n)]);
  const f={};for(const k of cube){if(nz(k.p)!==3)continue;const n=key(k.n);if(f[n]&&f[n]!==k.c)return false;f[n]=k.c;}return true;
}
function snapshot(){return cube.map(k=>[k.p[0],k.p[1],k.p[2],k.n[0],k.n[1],k.n[2]]);}
// Carga una foto del cubo; si no es válida queda armado
function applySnap(s){
  resetLogic();
  if(Array.isArray(s)&&s.length===cube.length){cube.forEach((k,i)=>{k.p=s[i].slice(0,3);k.n=s[i].slice(3,6);});}
}
// Las piezas que se ven (p = posición): 26 en el 3×3, las 8 esquinas en el 2×2
function forEachPiece(fn,n=size){for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if((x||y||z)&&(n===3||nz([x,y,z])===3))fn([x,y,z]);}

// ================= Notación =================
// Un giro es {f,n}: f = cara (U, D, R, L, F, B) y n = 1 horario, -1 antihorario, 2 media vuelta
const isMove=m=>!!m&&!!MOVES[m.f]&&[1,-1,2].includes(m.n);
// Mezcla al azar de n giros (no repite cara ni suele girar la opuesta seguida)
function genScramble(n){
  const F=size===2?'RUF':'UDFBRL';let last='';const seq=[];
  for(let i=0;i<n;i++){
    let f;do{f=F[Math.floor(Math.random()*F.length)];}while(f===last||f===OPP[last]&&Math.random()<0.5);
    last=f;seq.push({f,n:[1,-1,2][Math.floor(Math.random()*3)]});
  }
  return seq;
}
// Para los futuros entrenadores: texto ("R U R' U2") ↔ lista de giros, y la secuencia que la deshace
function parseSeq(txt){
  return txt.trim().split(/\s+/).filter(Boolean).map(t=>{
    const m=/^([UDFBRL])(2|')?$/.exec(t);if(!m)throw new Error('Giro no válido: '+t);
    return {f:m[1],n:m[2]==='2'?2:m[2]?-1:1};
  });
}
const seqText=seq=>seq.map(m=>m.f+(m.n===-1?"'":m.n===2?'2':'')).join(' ');
const invSeq=q=>q.slice().reverse().map(m=>({f:m.f,n:m.n===2?2:-m.n}));

// ================= Etapas del método por capas (solo 3×3) =================
// El blanco es la cara U del modelo y el amarillo la D. Una pieza se nombra por su posición de armado ("1,1,1").
const enSitio=id=>key(byId[id][0].p)===id;
const resuelta=id=>byId[id].every(k=>key(k.p)===id&&key(k.n)===key(k.hn));
// Piezas de una capa (y = 1 blanca, 0 media, -1 amarilla) con «tipo» calcomanías: 2 aristas, 3 esquinas
const piezas=(y,tipo)=>Object.keys(byId).filter(id=>{const p=id.split(',').map(Number);return p[1]===y&&nz(p)===tipo;});
const ETAPAS=[
  {id:'cruz',nombre:'Cruz blanca',ok:()=>piezas(1,2).every(resuelta)},
  {id:'esquinas',nombre:'Esquinas blancas',ok:()=>piezas(1,3).every(resuelta)},
  {id:'segunda',nombre:'Segunda capa',ok:()=>piezas(0,2).every(resuelta)},
  {id:'cruzAm',nombre:'Cruz amarilla',ok:()=>piezas(-1,2).every(id=>byId[id].some(k=>k.hn[1]===-1&&k.n[1]===-1))},
  {id:'aristasAm',nombre:'Aristas amarillas',ok:()=>piezas(-1,2).every(resuelta)},
  {id:'esquinasAm',nombre:'Esquinas en su sitio',ok:()=>piezas(-1,3).every(enSitio)},
  {id:'final',nombre:'Esquinas giradas',ok:()=>piezas(-1,3).every(resuelta)}
];
// Cuántas etapas seguidas están completas (0 a 7); cada una exige las anteriores
function etapa(){
  if(size!==3)return 0;
  let n=0;while(n<ETAPAS.length&&ETAPAS[n].ok())n++;
  return n;
}

return {FACE_OF,MOVES,OPP,FACE_DIR,key,nz,
  resetLogic,quarter,isSolved,snapshot,applySnap,forEachPiece,
  ETAPAS,etapa,enSitio,resuelta,piezas,
  isMove,genScramble,parseSeq,seqText,invSeq,
  get cube(){return cube;},get byId(){return byId;},
  get size(){return size;},set size(n){size=n===2?2:3;}};
})();
