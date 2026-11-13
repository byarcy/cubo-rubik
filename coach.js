/* coach.js · The "teacher" of Practice mode: looks at the cube and says which piece is next and with which turns.
   Logic only: it draws nothing and knows nothing about the interface. Uses CUBE (cube_logic.js) and ALGORITHMS (algorithms.js).
   Everything is expressed in model faces (white = U, yellow = D); the interface translates it to how the cube looks.
   Exposes a single global object: COACH. */
const COACH=(function(){
const {key,FACE_OF,parseSeq}=CUBE;
// The four slots of the white layer, in the order you go through them by turning the cube around its vertical axis
const CORNER_SLOTS=['1,1,1','-1,1,1','-1,1,-1','1,1,-1'];
const ROT={R:'F',F:'L',L:'B',B:'R',U:'U',D:'D'};
// Moves a sequence written for the U-R-F slot to slot k
function rotateToSlot(seq,k){
  return seq.map(m=>{let f=m.f;for(let i=0;i<k;i++)f=ROT[f];return {f,n:m.n};});
}
function apply(seq){
  for(const m of seq){CUBE.quarter(m.f,m.n===2?1:m.n);if(m.n===2)CUBE.quarter(m.f,1);}
}
const algoSeq=(name,k)=>rotateToSlot(parseSeq(ALGORITHMS.layers[name].seq),k);
const rand=n=>Math.floor(Math.random()*n);

// ================= Equivalent routes =================
// Each step has its main plan and, if there are any, other routes that also work (\`alt\`). The interface accepts
// any of them on the first turn and follows that one from there. Rules for a new lesson to provide them:
//   · Turning a layer one way is the same as turning it three times the other way: alignD(n).
//   · A piece on a diagonal (a corner or an edge between two faces) can be handled through the face on one side or
//     through the one on the other: mirror(plan,pos) gives the mirror route, and it is only offered if trial(...)
//     checks that it reaches the goal.
const MIRROR_XZ={R:'F',F:'R',L:'B',B:'L',U:'U',D:'D'};   // plane x=z
const MIRROR_X_NZ={R:'B',B:'R',L:'F',F:'L',U:'U',D:'D'};  // plane x=-z
function mirror(plan,p){
  const map=p[0]*p[2]>0?MIRROR_XZ:MIRROR_X_NZ;
  return plan.map(m=>({f:map[m.f],n:m.n===2?2:-m.n}));
}
// Applies a plan, checks whether "goal" holds and leaves the cube as it was
function trial(plan,goal){
  const snap=CUBE.snapshot();apply(plan);
  const ok=goal();CUBE.applySnap(snap);return ok;
}
// Mirror routes of a plan that reach the goal
function alternatives(plan,pos,goal){
  const r=mirror(plan,pos);
  return CUBE.seqText(r)===CUBE.seqText(plan)||!trial(r,goal)?[]:[r];
}
// Aligning a layer: a quarter turn one way equals three the other way (a half turn has no alternative)
function alignD(n){
  return n===2?[]:[[1,2,3].map(()=>({f:'D',n:-n}))];
}
// How many quarter turns of D bring the piece above its slot (1 to 3), as a single turn: 1, 2 or -1
function alignTurn(id,h){
  let c=0;
  do{CUBE.quarter('D',1);c++;}while(c<4&&(CUBE.byId[id][0].p[0]!==h[0]||CUBE.byId[id][0].p[2]!==h[2]));
  for(let i=0;i<c;i++)CUBE.quarter('D',-1);
  return c===3?-1:c;
}

// ================= White corners =================
// Looks at a white corner and returns its case and the turns that bring it closer to its slot:
//   take  · it is in the white layer but in the wrong place: it has to go down to the yellow layer
//   align · it is in the yellow layer, but not in front of its slot
//   cornerRight / cornerFront / cornerOut · it is in front of its slot; the case depends on where white faces
function cornerCase(id){
  const sts=CUBE.byId[id],p=sts[0].p,h=id.split(',').map(Number);
  if(p[1]===1){
    const plan=algoSeq('cornerTake',CORNER_SLOTS.indexOf(key([p[0],1,p[2]]))),before=CORNER_SLOTS.filter(CUBE.pieceSolved);
    return {id,kind:'take',plan,cost:2,alt:alternatives(plan,p,()=>CUBE.byId[id][0].p[1]===-1&&before.every(CUBE.pieceSolved))};
  }
  if(p[0]!==h[0]||p[2]!==h[2]){
    const n=alignTurn(id,h);
    return {id,kind:'align',plan:[{f:'D',n}],cost:1,alt:alignD(n)};
  }
  const k=CORNER_SLOTS.indexOf(id),white=sts.find(s=>s.hn[1]===1).n;
  const kind=white[1]===-1?'cornerOut':FACE_OF[key(white)]===rotateToSlot([{f:'R',n:1}],k)[0].f?'cornerRight':'cornerFront';
  return {id,kind,plan:algoSeq(kind,k),cost:0};
}
// Which corner is next. "current" (optional) is kept while it isn't solved, so the piece doesn't jump around.
// Returns {broken:true} if the white cross isn't there, {done:true} if the layer is complete, or the case from cornerCase.
function corners(current){
  if(!CUBE.STAGES[0].ok())return {broken:true};
  const missing=CORNER_SLOTS.filter(id=>!CUBE.pieceSolved(id));
  if(!missing.length)return {done:true};
  if(current&&missing.includes(current))return cornerCase(current);
  return missing.map(cornerCase).sort((a,b)=>a.cost-b.cost)[0];
}
// Finishes the white layer without animation (to prepare exercises)
function solveCorners(){
  for(let i=0;i<80;i++){
    const e=corners();
    if(!e.plan)return !!e.done;
    apply(e.plan);
  }
  return false;
}
// A "trigger" in a random slot: takes out the corner that is there and puts in the one below it. It doesn't break the cross.
function trigger(){
  apply(algoSeq(rand(2)?'cornerRight':'cornerFront',rand(4)));
  apply([{f:'D',n:[1,-1,2][rand(3)]}]);
}
// Exercise: white cross done, second and third layers scrambled and several white corners out of place
function generateCorners(){
  for(let attempt=0;attempt<20;attempt++){
    CUBE.resetLogic();
    for(let i=0;i<30;i++)trigger();
    if(!solveCorners())continue;
    for(let i=0,n=4+rand(4);i<n;i++)trigger();
    if(corners().plan)return true;
  }
  return false;
}

// ================= White cross =================
// Beginner recipe, always the same: take the edge to the yellow layer, turn that layer until it is
// on the face of its color and put it in with a half turn. The four edges, in the order of rotateToSlot():
const CROSS_EDGES=['0,1,1','-1,1,0','0,1,-1','1,1,0'];
// Cases of a white edge:
//   crossTake    · it is in the white layer but in the wrong place: a half turn of its face takes it to the yellow layer
//   crossMiddle  · it is in the middle layer: three turns take it to the yellow layer without harming the cross
//   align        · it is in the yellow layer, but not on the face of its color
//   crossUp      · it is on its face with white facing outward (yellow face): a half turn and it goes in
//   crossFlipped · it is on its face, but white faces sideways: four turns put it in the right way round
function edgeCase(id){
  const sts=CUBE.byId[id],p=sts[0].p,h=id.split(',').map(Number),k=CROSS_EDGES.indexOf(id);
  if(p[1]===1)return {id,kind:'crossTake',plan:[{f:FACE_OF[key([p[0],0,p[2]])],n:2}],cost:4};
  if(p[1]===0){
    const plan=algoSeq('crossMiddle',CORNER_SLOTS.indexOf(key([p[0],1,p[2]]))),before=CROSS_EDGES.filter(CUBE.pieceSolved);
    return {id,kind:'crossMiddle',plan,cost:3,alt:alternatives(plan,p,()=>CUBE.byId[id][0].p[1]===-1&&before.every(CUBE.pieceSolved))};
  }
  if(p[0]!==h[0]||p[2]!==h[2]){
    const n=alignTurn(id,h);
    return {id,kind:'align',plan:[{f:'D',n}],cost:2,alt:alignD(n)};
  }
  const kind=sts.find(s=>s.hn[1]===1).n[1]===-1?'crossUp':'crossFlipped';
  return {id,kind,plan:algoSeq(kind,k),cost:kind==='crossUp'?0:1};
}
function cross(current){
  const missing=CROSS_EDGES.filter(id=>!CUBE.pieceSolved(id));
  if(!missing.length)return {done:true};
  if(current&&missing.includes(current))return edgeCase(current);
  return missing.map(edgeCase).sort((a,b)=>a.cost-b.cost)[0];
}
// Exercise: a fully scrambled cube, with at least two white edges still to place
function generateCross(){
  for(let attempt=0;attempt<50;attempt++){
    CUBE.resetLogic();
    apply(CUBE.genScramble(25));
    if(CROSS_EDGES.filter(id=>!CUBE.pieceSolved(id)).length>=2)return true;
  }
  return false;
}

// Lessons of Practice mode. step(current) says which piece is next, with which turns and which equivalent routes exist;
// generate() prepares an exercise. To add a lesson: add it here and run tests/lessons.test.js.
// pieces: the ones the lesson places; once one is placed, no step may take it out of its place again
const LESSONS={
  cross:{stage:0,step:cross,generate:generateCross,pieces:()=>CROSS_EDGES},
  corners:{stage:1,step:corners,generate:generateCorners,pieces:()=>[...CROSS_EDGES,...CORNER_SLOTS]}
};

return {CORNER_SLOTS,CROSS_EDGES,LESSONS,rotateToSlot,apply,cornerCase,corners,solveCorners,generateCorners,edgeCase,cross,generateCross};
})();
