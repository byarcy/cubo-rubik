/* cube_logic.js · Internal state of the cube and turn notation.
   It draws nothing and knows nothing about the interface: only pieces, turns and checks.
   Exposes a single global object: CUBE. */
const CUBE=(function(){
// ================= Constants =================
const FACE_OF={'0,1,0':'U','0,-1,0':'D','0,0,1':'F','0,0,-1':'B','1,0,0':'R','-1,0,0':'L'};
// The six faces: axis, layer, sign of the clockwise turn seen from that face (what the screen turns with a finger)
const MOVES={R:[0,1,-1],L:[0,-1,1],U:[1,1,-1],D:[1,-1,1],F:[2,1,-1],B:[2,-1,1]};
// Every turn the notation knows: axis, the layers it moves (-1, 0, 1) and the sign of its clockwise turn.
//   faces R L U D F B · middle layers M (like L), E (like D), S (like F) · two layers r l u d f b, also written Rw Lw…
//   (a face and the middle one next to it) · the whole cube x (like R), y (like U), z (like F)
const TURNS={};
for(const f in MOVES){
  const [a,l,s]=MOVES[f];
  TURNS[f]={a,layers:[l],s};
  TURNS[f.toLowerCase()]=TURNS[f+'w']={a,layers:[l,0],s};
}
Object.assign(TURNS,{
  M:{a:0,layers:[0],s:1},E:{a:1,layers:[0],s:1},S:{a:2,layers:[0],s:-1},
  x:{a:0,layers:[-1,0,1],s:-1},y:{a:1,layers:[-1,0,1],s:-1},z:{a:2,layers:[-1,0,1],s:-1}
});
const OPP={U:'D',D:'U',R:'L',L:'R',F:'B',B:'F'};
const FACE_DIR={U:[0,1,0],D:[0,-1,0],R:[1,0,0],L:[-1,0,0],F:[0,0,1],B:[0,0,-1]};
const key=v=>v.map(x=>(x===0?0:x)).join(',');
const nz=h=>h.filter(v=>v!==0).length;

// ================= Logical model =================
// The state is one rotation per piece: R says where each of its home directions points now. Every turn spins pieces about
// the center of the cube, so R alone also says where the piece is: p = R·(its home spot). Centers keep their spin too.
// The stickers are worked out from R, and they are what the rest of the app reads:
// cube: one entry per sticker. id = piece it belongs to, hn = where it faces when the cube is solved,
// p = current position of the piece, n = where it faces now, c = color (letter of its face)
// byId: the stickers grouped by piece. size: 3 (3×3) or 2 (2×2, same model; only the corners count)
let pieces=[],pieceOf={},cube=[],byId={},size=3;
// Every piece and sticker of the solved cube, always in the same order (snapshots rely on it)
const HOME=[],PIECES=[];
for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
  if(!x&&!y&&!z)continue;
  const p=[x,y,z],id=key(p),hns=[];
  for(let a=0;a<3;a++){if(!p[a])continue;const n=[0,0,0];n[a]=p[a];HOME.push({id,hn:n});hns.push(n);}
  PIECES.push({id,home:p,hns});
}
const AXES=[[1,0,0],[0,1,0],[0,0,1]];
// R as its three columns (where x, y and z of the piece point now); R·v
const times=(R,v)=>[R[0][0]*v[0]+R[1][0]*v[1]+R[2][0]*v[2],R[0][1]*v[0]+R[1][1]*v[1]+R[2][1]*v[2],R[0][2]*v[0]+R[1][2]*v[1]+R[2][2]*v[2]];
// Puts the stickers of a piece where its R says
function place(pc){
  pc.p=times(pc.R,pc.home);
  for(const k of pc.st){k.p=pc.p;k.n=times(pc.R,k.hn);}
}
function resetLogic(){
  pieces=[];pieceOf={};cube=[];byId={};
  for(const h of PIECES){
    const pc={id:h.id,home:h.home,R:AXES.map(a=>[...a]),st:h.hns.map(hn=>({id:h.id,hn:[...hn],c:FACE_OF[key(hn)],p:null,n:null}))};
    place(pc);pieces.push(pc);pieceOf[h.id]=pc;cube.push(...pc.st);byId[h.id]=pc.st;
  }
}
// A quarter turn of vector v about axis a (s > 0: one way, s < 0: the other)
function rot(v,a,s){
  const b=(a+1)%3,c=(a+2)%3,w=[v[0],v[1],v[2]];
  if(s>0){w[b]=-v[c];w[c]=v[b];}else{w[b]=v[c];w[c]=-v[b];}
  return w;
}
// A quarter turn f (any name of TURNS; dir: 1 clockwise, -1 counter-clockwise)
function quarter(f,dir){
  const {a,layers,s}=TURNS[f];const sg=s*dir;
  // the same quarter turn for its rotation, its position and its stickers (cheaper than working them out again)
  for(const pc of pieces)if(layers.includes(pc.p[a])){
    pc.R=[rot(pc.R[0],a,sg),rot(pc.R[1],a,sg),rot(pc.R[2],a,sg)];pc.p=rot(pc.p,a,sg);
    for(const k of pc.st){k.p=pc.p;k.n=rot(k.n,a,sg);}
  }
}
// A turn {f,n} (n: 1, -1 or 2) and a sequence of them. The only place where a half turn becomes two quarter turns.
function move(m){quarter(m.f,m.n===2?1:m.n);if(m.n===2)quarter(m.f,1);}
function apply(seq){for(const m of seq)move(m);}
// Where a piece is and how it is turned (for drawing it): {p, R}
function frameOf(id){const pc=pieceOf[id];return {p:pc.p,R:pc.R};}
// Solved: every face is a single color, however the cube is held (after x or M the centers have moved). The 2×2 has no
// centers: only its corners count.
function isSolved(){
  const f={};
  for(const k of cube){if(size===2&&nz(k.p)!==3)continue;const n=key(k.n);if(f[n]&&f[n]!==k.c)return false;f[n]=k.c;}
  return true;
}
// How the cube is held now: the turn that takes the solved cube's frame to where the centers are (on the 2×2, which has
// none, where the corner of the yellow, orange and blue faces is). A piece is in place when it agrees with it.
function frame(){
  if(size===2)return pieceOf['-1,-1,-1'].R;
  return [pieceOf['1,0,0'].p,pieceOf['0,1,0'].p,pieceOf['0,0,1'].p];
}
// A snapshot: the R of each piece, in the order of PIECES, as 9 numbers (its three columns)
function snapshot(){return pieces.map(pc=>[...pc.R[0],...pc.R[1],...pc.R[2]]);}
// Puts back a snapshot taken in this session (no checks: it is always one of ours)
function restore(s){
  if(!pieces.length)resetLogic();
  pieces.forEach((pc,i)=>{pc.R=[s[i].slice(0,3),s[i].slice(3,6),s[i].slice(6,9)];place(pc);});
}
// Runs fn and then leaves the cube exactly as it was, even if fn fails: for trying turns without touching the real cube
function withSnapshot(fn){const s=snapshot();try{return fn();}finally{restore(s);}}
// Loads a snapshot from outside (a save), in today's format or in the one saved up to v0.41. If it isn't a cube that can
// exist, the cube is left solved and it returns false. No snapshot (null) is a solved cube on purpose, and returns true.
function applySnap(s){
  resetLogic();
  if(s==null)return true;
  const r=toRotations(s);
  if(!r||!validSnap(r))return false;
  restore(r);return true;
}

// ================= Saves up to v0.41: one entry per sticker =================
// Then a snapshot was, for each sticker (in the order of HOME), [p, n]: where its piece is and where it faces. The R of
// a piece comes out of where its stickers face (a center had no spin: it is left as it was). null if it doesn't fit.
const isStickerSnap=s=>Array.isArray(s)&&s.length===HOME.length&&s.every(e=>Array.isArray(e)&&e.length===6);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function fromStickers(s){
  if(!s.every(e=>e.every(v=>v===-1||v===0||v===1)))return null;
  let k=0;const out=[];
  for(const h of PIECES){
    const st=s.slice(k,k+h.hns.length);k+=h.hns.length;
    const R=[null,null,null];
    h.hns.forEach((hn,j)=>{const a=hn.findIndex(v=>v!==0);R[a]=st[j].slice(3,6).map(v=>v*hn[a]);});
    if(h.hns.length===1)R.forEach((c,i)=>{if(!c)R[i]=[...AXES[i]];});
    else for(let i=0;i<3;i++)if(!R[i])R[i]=cross(R[(i+1)%3],R[(i+2)%3]);
    if(R.some(c=>nz(c)!==1))return null;
    // every sticker must be where that R puts the piece
    const p=key(times(R,h.home));
    if(!st.every(e=>key(e.slice(0,3))===p))return null;
    out.push([...R[0],...R[1],...R[2]]);
  }
  return out;
}
// A snapshot in today's format: as it is if it already is; converted if it is an old one; null if it is neither
function toRotations(s){
  if(isStickerSnap(s))return fromStickers(s);
  return Array.isArray(s)&&s.length===PIECES.length&&s.every(e=>Array.isArray(e)&&e.length===9)?s:null;
}

// ================= Checking a snapshot =================
// A snapshot is valid if it is a cube that turns can reach: every R is a real turn (each column along a different axis,
// not a mirror image); every piece is whole on a spot of its kind; no two pieces share a spot; the centers keep their
// places relative to each other (they may be spun); and the rules of a real cube hold: the corner twists add up to a
// multiple of 3, the flipped edges are an even number, and the swaps of corners, edges and centers add up to an even number.
const det=(a,b,c)=>a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);
function parity(homes,now){
  const perm=now.map(k=>homes.indexOf(k)),seen=[];let swaps=0;
  for(let i=0;i<perm.length;i++){if(seen[i])continue;let j=i,len=0;while(!seen[j]){seen[j]=true;j=perm[j];len++;}swaps+=len-1;}
  return swaps%2;
}
function validSnap(s0){
  const s=toRotations(s0);
  if(!s||!s.every(e=>e.every(v=>v===-1||v===0||v===1)))return false;
  const st=[];
  for(let i=0;i<PIECES.length;i++){
    const R=[s[i].slice(0,3),s[i].slice(3,6),s[i].slice(6,9)];
    if(R.some(c=>nz(c)!==1)||det(R[0],R[1],R[2])!==1)return false;
    const p=times(R,PIECES[i].home);
    for(const hn of PIECES[i].hns)st.push([...p,...times(R,hn)]);
  }
  return validStickers(st);
}
// The same checks on the stickers ([p, n] of each one, in the order of HOME)
function validStickers(s){
  const pieces={};
  for(let i=0;i<s.length;i++){
    const e=s[i],p=e.slice(0,3),n=e.slice(3,6),a=n.findIndex(v=>v!==0);
    if(nz(n)!==1||p[a]!==n[a])return false;
    (pieces[HOME[i].id]=pieces[HOME[i].id]||[]).push({p,n,hn:HOME[i].hn});
  }
  const taken=new Set(),corners=[],edges=[],centers=[];
  for(const id in pieces){
    const st=pieces[id],kind=nz(id.split(',').map(Number)),here=key(st[0].p);
    if(!st.every(t=>key(t.p)===here)||nz(st[0].p)!==kind||taken.has(here))return false;
    if(new Set(st.map(t=>key(t.n))).size!==st.length)return false;
    taken.add(here);
    if(kind===1)centers.push({id,here,p:st[0].p});
    if(kind===3){
      if(det(st[0].n,st[1].n,st[2].n)!==det(st[0].hn,st[1].hn,st[2].hn))return false;
      corners.push({id,here,st});
    }
    if(kind===2)edges.push({id,here,st});
  }
  // twist: the stickers of a corner in turning order from its white or yellow one; the twist is which of them faces
  // the white or yellow side now (0, 1 or 2)
  let twist=0;
  for(const c of corners){
    const y=c.st.find(t=>t.hn[1]!==0),[a,b]=c.st.filter(t=>t!==y),order=det(y.hn,a.hn,b.hn)>0?[y,a,b]:[y,b,a];
    twist+=order.findIndex(t=>t.n[1]!==0);
  }
  if(twist%3)return false;
  // flip: an edge is flipped if its white or yellow sticker (or, in the middle layer, its front or back one) doesn't face
  // the white or yellow side (in the middle layer, the front or back)
  let flip=0;
  for(const e of edges){
    const main=e.st.find(t=>t.hn[1]!==0)||e.st.find(t=>t.hn[2]!==0),axis=e.st[0].p[1]!==0?1:2;
    if(main.n[axis]===0)flip++;
  }
  if(flip%2)return false;
  // the centers only move all together (M, E, S or the whole cube), as one turn of the solved frame
  const at=id=>centers.find(c=>c.id===id).p,C=[at('1,0,0'),at('0,1,0'),at('0,0,1')];
  if(det(C[0],C[1],C[2])!==1||!centers.every(c=>key(c.p)===key(times(C,c.id.split(',').map(Number)))))return false;
  // swaps: a face turn swaps corners and edges an odd number of times each; a middle layer swaps edges and centers
  return (parity(corners.map(c=>c.id),corners.map(c=>c.here))+parity(edges.map(e=>e.id),edges.map(e=>e.here))
    +parity(centers.map(c=>c.id),centers.map(c=>c.here)))%2===0;
}
// The visible pieces (p = position): 26 in the 3×3, the 8 corners in the 2×2
function forEachPiece(fn,n=size){for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if((x||y||z)&&(n===3||nz([x,y,z])===3))fn([x,y,z]);}

// ================= Notation =================
// A turn is {f,n}: f = a name of TURNS (R, M, r, Rw, x…) and n = 1 clockwise, -1 counter-clockwise, 2 half turn
const isMove=m=>!!m&&Object.prototype.hasOwnProperty.call(TURNS,m.f)&&[1,-1,2].includes(m.n);
// Random scramble of n turns (never repeats a face, and rarely turns the opposite one right after)
function genScramble(n){
  const F=size===2?'RUF':'UDFBRL';let last='';const seq=[];
  for(let i=0;i<n;i++){
    let f;do{f=F[Math.floor(Math.random()*F.length)];}while(f===last||f===OPP[last]&&Math.random()<0.5);
    last=f;seq.push({f,n:[1,-1,2][Math.floor(Math.random()*3)]});
  }
  return seq;
}
// Text ("R U R' U2") ↔ list of turns, and the sequence that undoes one. The text may come as the guides and websites
// write it: brackets for groups "(R U R' U')", no spaces "RUR'U'", the typographic apostrophe ’, and R2' (= R2).
const TOKEN=/([UDFBRL]w|[UDFBRLMESxyzudfbrl])(2'|'2|2|'|)/y;
function parseSeq(txt){
  const out=[];
  for(const chunk of String(txt).replace(/[’´`]/g,"'").replace(/[()[\]]/g,' ').trim().split(/\s+/).filter(Boolean)){
    TOKEN.lastIndex=0;let m;
    while(TOKEN.lastIndex<chunk.length&&(m=TOKEN.exec(chunk)))out.push({f:m[1],n:m[2].includes('2')?2:m[2]?-1:1});
    if(TOKEN.lastIndex!==chunk.length||!m)throw new Error('Invalid turn: '+chunk);
  }
  return out;
}
const seqText=seq=>seq.map(m=>m.f+(m.n===-1?"'":m.n===2?'2':'')).join(' ');
const invSeq=q=>q.slice().reverse().map(m=>({f:m.f,n:m.n===2?2:-m.n}));

// ================= Pieces in place (what the stages of each method, in methods.js, are made of) =================
// White is the model's U face and yellow its D face. A piece is named by its solved position ("1,1,1").
// In place: where the centers say its spot is now; solved: in place and turned as the centers (see frame).
const sameR=(A,B)=>A.every((c,i)=>c[0]===B[i][0]&&c[1]===B[i][1]&&c[2]===B[i][2]);
const inPlace=id=>{const pc=pieceOf[id];return key(pc.p)===key(times(frame(),pc.home));};
const pieceSolved=id=>sameR(pieceOf[id].R,frame());
// A sticker faces the face of its own color (for the yellow cross: yellow facing the yellow center)
const facesHome=k=>key(k.n)===key(times(frame(),k.hn));
// Pieces of a layer (y = 1 white, 0 middle, -1 yellow) with "kind" stickers: 2 edges, 3 corners
const piecesOf=(y,kind)=>Object.keys(byId).filter(id=>{const p=id.split(',').map(Number);return p[1]===y&&nz(p)===kind;});
// The cube exists from the start, solved: it is never an empty list (a snapshot of it always has every piece)
resetLogic();
return {FACE_OF,MOVES,TURNS,OPP,FACE_DIR,key,nz,frame,
  resetLogic,quarter,isSolved,snapshot,applySnap,forEachPiece,
  inPlace,pieceSolved,piecesOf,facesHome,
  isMove,genScramble,parseSeq,seqText,invSeq,move,apply,withSnapshot,validSnap,frameOf,
  get cube(){return cube;},get byId(){return byId;},
  get size(){return size;},set size(n){size=n===2?2:3;}};
})();
