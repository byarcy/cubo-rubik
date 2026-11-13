/* cube_logic.js · Internal state of the cube and turn notation.
   It draws nothing and knows nothing about the interface: only pieces, turns and checks.
   Exposes a single global object: CUBE. */
const CUBE=(function(){
// ================= Constants =================
const FACE_OF={'0,1,0':'U','0,-1,0':'D','0,0,1':'F','0,0,-1':'B','1,0,0':'R','-1,0,0':'L'};
// axis, layer, sign of the clockwise turn seen from that face
const MOVES={R:[0,1,-1],L:[0,-1,1],U:[1,1,-1],D:[1,-1,1],F:[2,1,-1],B:[2,-1,1]};
const OPP={U:'D',D:'U',R:'L',L:'R',F:'B',B:'F'};
const FACE_DIR={U:[0,1,0],D:[0,-1,0],R:[1,0,0],L:[-1,0,0],F:[0,0,1],B:[0,0,-1]};
const key=v=>v.map(x=>(x===0?0:x)).join(',');
const nz=h=>h.filter(v=>v!==0).length;

// ================= Logical model =================
// cube: one entry per sticker. id = piece it belongs to, hn = where it faces when the cube is solved,
// p = current position of the piece, n = where it faces now, c = color (letter of its face)
// byId: the stickers grouped by piece. size: 3 (3×3) or 2 (2×2, same model; only the corners count)
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
// A quarter turn of face f (dir: 1 clockwise, -1 counter-clockwise)
function quarter(f,dir){
  const [a,l,s]=MOVES[f];const sg=s*dir;
  for(const k of cube){if(k.p[a]===l){k.p=rot(k.p,a,sg);k.n=rot(k.n,a,sg);}}
}
// 2×2: there are no centers; solved = every face is a single color (only the corners count)
function isSolved(){
  if(size===3)return cube.every(k=>k.c===FACE_OF[key(k.n)]);
  const f={};for(const k of cube){if(nz(k.p)!==3)continue;const n=key(k.n);if(f[n]&&f[n]!==k.c)return false;f[n]=k.c;}return true;
}
function snapshot(){return cube.map(k=>[k.p[0],k.p[1],k.p[2],k.n[0],k.n[1],k.n[2]]);}
// Loads a snapshot of the cube; if it isn't valid the cube is left solved
function applySnap(s){
  resetLogic();
  if(Array.isArray(s)&&s.length===cube.length){cube.forEach((k,i)=>{k.p=s[i].slice(0,3);k.n=s[i].slice(3,6);});}
}
// The visible pieces (p = position): 26 in the 3×3, the 8 corners in the 2×2
function forEachPiece(fn,n=size){for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if((x||y||z)&&(n===3||nz([x,y,z])===3))fn([x,y,z]);}

// ================= Notation =================
// A turn is {f,n}: f = face (U, D, R, L, F, B) and n = 1 clockwise, -1 counter-clockwise, 2 half turn
const isMove=m=>!!m&&!!MOVES[m.f]&&[1,-1,2].includes(m.n);
// Random scramble of n turns (never repeats a face, and rarely turns the opposite one right after)
function genScramble(n){
  const F=size===2?'RUF':'UDFBRL';let last='';const seq=[];
  for(let i=0;i<n;i++){
    let f;do{f=F[Math.floor(Math.random()*F.length)];}while(f===last||f===OPP[last]&&Math.random()<0.5);
    last=f;seq.push({f,n:[1,-1,2][Math.floor(Math.random()*3)]});
  }
  return seq;
}
// Text ("R U R' U2") ↔ list of turns, and the sequence that undoes one
function parseSeq(txt){
  return txt.trim().split(/\s+/).filter(Boolean).map(t=>{
    const m=/^([UDFBRL])(2|')?$/.exec(t);if(!m)throw new Error('Invalid turn: '+t);
    return {f:m[1],n:m[2]==='2'?2:m[2]?-1:1};
  });
}
const seqText=seq=>seq.map(m=>m.f+(m.n===-1?"'":m.n===2?'2':'')).join(' ');
const invSeq=q=>q.slice().reverse().map(m=>({f:m.f,n:m.n===2?2:-m.n}));

// ================= Stages of the layer-by-layer method (3×3 only) =================
// White is the model's U face and yellow its D face. A piece is named by its solved position ("1,1,1").
const inPlace=id=>key(byId[id][0].p)===id;
const pieceSolved=id=>byId[id].every(k=>key(k.p)===id&&key(k.n)===key(k.hn));
// Pieces of a layer (y = 1 white, 0 middle, -1 yellow) with "kind" stickers: 2 edges, 3 corners
const piecesOf=(y,kind)=>Object.keys(byId).filter(id=>{const p=id.split(',').map(Number);return p[1]===y&&nz(p)===kind;});
// The name of each stage is in the languages: key "stage.<id>"
const STAGES=[
  {id:'cross',ok:()=>piecesOf(1,2).every(pieceSolved)},
  {id:'corners',ok:()=>piecesOf(1,3).every(pieceSolved)},
  {id:'secondLayer',ok:()=>piecesOf(0,2).every(pieceSolved)},
  {id:'yellowCross',ok:()=>piecesOf(-1,2).every(id=>byId[id].some(k=>k.hn[1]===-1&&k.n[1]===-1))},
  {id:'yellowEdges',ok:()=>piecesOf(-1,2).every(pieceSolved)},
  {id:'yellowCornersPlace',ok:()=>piecesOf(-1,3).every(inPlace)},
  {id:'yellowCornersTurn',ok:()=>piecesOf(-1,3).every(pieceSolved)}
];
// How many consecutive stages are complete (0 to 7); each one requires the previous ones
function stage(){
  if(size!==3)return 0;
  let n=0;while(n<STAGES.length&&STAGES[n].ok())n++;
  return n;
}

return {FACE_OF,MOVES,OPP,FACE_DIR,key,nz,
  resetLogic,quarter,isSolved,snapshot,applySnap,forEachPiece,
  STAGES,stage,inPlace,pieceSolved,piecesOf,
  isMove,genScramble,parseSeq,seqText,invSeq,
  get cube(){return cube;},get byId(){return byId;},
  get size(){return size;},set size(n){size=n===2?2:3;}};
})();
