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

// ================= Second layer =================
// White stays on top and the middle edges come up from the yellow layer, as in the guide. The four middle edges,
// named by their solved position, in the same order as CORNER_SLOTS:
const MIDDLE_EDGES=CORNER_SLOTS.map(id=>{const p=id.split(',');return p[0]+',0,'+p[2];});
const whiteLayerSolved=()=>CROSS_EDGES.every(CUBE.pieceSolved)&&CORNER_SLOTS.every(CUBE.pieceSolved);
// Cases of a middle edge:
//   secondTake  · it is in the middle layer but in another slot or flipped: an insertion there takes it down
//   align       · it is in the yellow layer, but not under the center of its side color
//   secondRight / secondLeft · it is under the center of its side color; it goes up into its slot to the right or left
// «face» is the model face of the side color (the center the edge has to match), for the messages and the focus.
function middleCase(id){
  const sts=CUBE.byId[id],p=sts[0].p,h=id.split(',').map(Number);
  if(p[1]===0){
    const k=CORNER_SLOTS.indexOf(key([p[0],1,p[2]])),before=MIDDLE_EDGES.filter(CUBE.pieceSolved);
    const goal=()=>CUBE.byId[id][0].p[1]===-1&&whiteLayerSolved()&&before.every(CUBE.pieceSolved);
    const plan=algoSeq('secondRight',k),other=algoSeq('secondLeft',k);
    return {id,kind:'secondTake',plan,cost:3,alt:trial(other,goal)?[other]:[]};
  }
  const side=sts.find(s=>s.n[1]!==-1),under=CUBE.FACE_DIR[side.c];
  if(p[0]!==under[0]||p[2]!==under[2]){
    const n=alignTurn(id,under);
    return {id,kind:'align',plan:[{f:'D',n}],cost:1,alt:alignD(n),face:side.c};
  }
  const k=CORNER_SLOTS.indexOf(key([h[0],1,h[2]]));
  const kind=side.c===rotateToSlot([{f:'F',n:1}],k)[0].f?'secondRight':'secondLeft';
  return {id,kind,plan:algoSeq(kind,k),cost:0,face:side.c};
}
// Which middle edge is next. Returns {broken:true} if the white layer isn't complete, {done:true} when the layer is.
function secondLayer(current){
  if(!whiteLayerSolved())return {broken:true};
  const missing=MIDDLE_EDGES.filter(id=>!CUBE.pieceSolved(id));
  if(!missing.length)return {done:true};
  if(current&&missing.includes(current))return middleCase(current);
  return missing.map(middleCase).sort((a,b)=>a.cost-b.cost)[0];
}
// Exercise: white layer done, middle and yellow layers scrambled by random insertions, at least two edges to place
function generateSecond(){
  for(let attempt=0;attempt<30;attempt++){
    CUBE.resetLogic();
    for(let i=0;i<25;i++){
      apply(algoSeq(rand(2)?'secondRight':'secondLeft',rand(4)));
      apply([{f:'D',n:[1,-1,2][rand(3)]}]);
    }
    if(whiteLayerSolved()&&MIDDLE_EDGES.filter(id=>!CUBE.pieceSolved(id)).length>=2)return true;
  }
  return false;
}

// ================= Last layer (yellow) =================
// From here on the guide turns the cube over: the interface shows these lessons with yellow on top (yellowUp).
// The model doesn't change: yellow is still D. Each step is one algorithm from one of the four sides, or a turn of
// the yellow layer; the coach finds the shortest way by trying them (few combinations, so it is instant).
const YELLOW_EDGES=CROSS_EDGES.map(id=>id.replace(',1,',',-1,'));
const YELLOW_CORNERS=CORNER_SLOTS.map(id=>id.replace(',1,',',-1,'));
const MIDDLE_DONE=()=>whiteLayerSolved()&&MIDDLE_EDGES.every(CUBE.pieceSolved);
const edgeUp=id=>CUBE.byId[id].some(k=>k.hn[1]===-1&&k.n[1]===-1);     // its yellow sticker faces the yellow side
const fromSides=name=>[0,1,2,3].map(r=>algoSeq(name,r));
// The routes (algorithm from each side) that start a shortest solution of «goal», looking up to «depth» algorithms ahead
function shortest(name,goal,depth){
  const seqs=fromSides(name);
  const reach=(r,d)=>{
    const snap=CUBE.snapshot();apply(seqs[r]);
    const ok=d===1?goal():[0,1,2,3].some(r2=>reach(r2,d-1));
    CUBE.applySnap(snap);return ok;
  };
  for(let d=1;d<=depth;d++){
    const firsts=seqs.filter((s,r)=>reach(r,d));
    if(firsts.length)return firsts;
  }
  return [];
}
// The step as the interface expects it: the first route is the plan, the rest are equivalent routes
const viaAlgorithm=(kind,routes,extra)=>Object.assign({kind,plan:routes[0],cost:0,alt:routes.slice(1)},extra);
// Turns of the yellow layer: how many matching pieces each of the four positions leaves (0 = as it is)
function afterTurns(count){
  const out=[];
  for(let k=0;k<4;k++){out.push(count());CUBE.quarter('D',1);}
  return out;
}
const turnOf=k=>k===3?-1:k;

// ---- 4 · Yellow cross: the four yellow edges pointing up (yellow side), in any place ----
//   yCrossDot / yCrossL / yCrossLine · the shape on top before the algorithm (only the center / an L / a line)
function yellowCross(){
  if(!MIDDLE_DONE())return {broken:true};
  const up=YELLOW_EDGES.filter(edgeUp);
  if(up.length===4)return {done:true};
  const kind=up.length===0?'yCrossDot':up.length===2&&up.every((id,i,a)=>a.some(o=>o!==id&&id.split(',').map(Number).every((v,j)=>v===-o.split(',').map(Number)[j]||j===1)))?'yCrossLine':'yCrossL';
  // the yellow shape on top is lit: the edges that point up and the yellow center
  return viaAlgorithm(kind,shortest('yellowCross',()=>YELLOW_EDGES.every(edgeUp),3),{focus:[...up,'0,-1,0']});
}

// ---- 5 · Yellow edges: each yellow edge under the center of its color ----
//   align · turning the yellow layer is enough to match more edges (or all of them)
//   yEdgesSwap     · two neighboring edges match: the algorithm swaps the other two (then a turn lines them up)
//   yEdgesOpposite · the two that match are opposite: the algorithm once makes two neighbors match
function yellowEdges(){
  if(!MIDDLE_DONE()||!YELLOW_EDGES.every(edgeUp))return {broken:true};
  const matching=()=>YELLOW_EDGES.filter(CUBE.pieceSolved).length;
  if(matching()===4)return {done:true};
  const counts=afterTurns(matching),best=Math.max(...counts),k=counts.indexOf(best);
  if(best===4||(counts[0]<2&&best>=2)){
    const n=turnOf(k);
    return {kind:'align',plan:[{f:'D',n}],cost:0,alt:alignD(n)};
  }
  const solvedAfter=()=>afterTurns(matching).includes(4);
  const solving=shortest('yellowEdges',solvedAfter,1);
  const focus=YELLOW_EDGES.filter(CUBE.pieceSolved);
  if(solving.length)return viaAlgorithm('yEdgesSwap',solving,{focus});
  return viaAlgorithm('yEdgesOpposite',shortest('yellowEdges',solvedAfter,2),{focus});
}

// ---- 6 · Yellow corners in place: each yellow corner in its corner (it may still be turned) ----
//   yCornersNone  · no corner is in place: the algorithm once leaves one in place
//   yCornersCycle · one corner is in place: the algorithm moves the other three around it (once or twice)
function yellowCornersPlace(){
  if(!MIDDLE_DONE()||!YELLOW_EDGES.every(CUBE.pieceSolved))return {broken:true};
  const placed=YELLOW_CORNERS.filter(CUBE.inPlace);
  if(placed.length===4)return {done:true};
  const routes=shortest('yellowCorners',()=>YELLOW_CORNERS.every(CUBE.inPlace),3);
  return viaAlgorithm(placed.length?'yCornersCycle':'yCornersNone',routes,{focus:placed});
}

// Exercises of the last layer: a solved cube, the last layer scrambled with the same algorithms (so the first two
// layers stay done), and the earlier yellow lessons solved by the coach itself, up to the lesson's stage
function scrambleLastLayer(){
  CUBE.resetLogic();
  for(let i=0;i<20;i++){
    apply(algoSeq(['yellowCross','yellowEdges','yellowCorners'][rand(3)],rand(4)));
    apply([{f:'D',n:[1,-1,2][rand(3)]}]);
  }
}
function solveWith(step){
  for(let i=0;i<40;i++){const e=step();if(!e.plan)return !!e.done;apply(e.plan);}
  return false;
}
function generateLastLayer(stage,before){
  for(let attempt=0;attempt<60;attempt++){
    scrambleLastLayer();
    if(before.every(solveWith)&&CUBE.stage()===stage)return true;
  }
  return false;
}

// Lessons of Practice mode. step(current) says which piece is next, with which turns and which equivalent routes exist;
// generate() prepares an exercise. To add a lesson: add it here and run tests/lessons.test.js.
// pieces: the ones the lesson places; once one is placed, no step may take it out of its place again
const LESSONS={
  cross:{stage:0,step:cross,generate:generateCross,pieces:()=>CROSS_EDGES},
  corners:{stage:1,step:corners,generate:generateCorners,pieces:()=>[...CROSS_EDGES,...CORNER_SLOTS]},
  secondLayer:{stage:2,step:secondLayer,generate:generateSecond,pieces:()=>[...CROSS_EDGES,...CORNER_SLOTS,...MIDDLE_EDGES]},
  // yellowUp: the interface shows the cube with yellow on top, as the guide does for the last layer
  yellowCross:{stage:3,step:yellowCross,generate:()=>generateLastLayer(3,[]),yellowUp:true,
    pieces:()=>[...CROSS_EDGES,...CORNER_SLOTS,...MIDDLE_EDGES]},
  yellowEdges:{stage:4,step:yellowEdges,generate:()=>generateLastLayer(4,[yellowCross]),yellowUp:true,
    pieces:()=>[...CROSS_EDGES,...CORNER_SLOTS,...MIDDLE_EDGES]},
  yellowCornersPlace:{stage:5,step:yellowCornersPlace,generate:()=>generateLastLayer(5,[yellowCross,yellowEdges]),yellowUp:true,
    pieces:()=>[...CROSS_EDGES,...CORNER_SLOTS,...MIDDLE_EDGES,...YELLOW_EDGES]}
};

return {CORNER_SLOTS,CROSS_EDGES,MIDDLE_EDGES,YELLOW_EDGES,YELLOW_CORNERS,LESSONS,middleCase,secondLayer,generateSecond,
  yellowCross,yellowEdges,yellowCornersPlace,rotateToSlot,apply,cornerCase,corners,solveCorners,generateCorners,edgeCase,cross,generateCross};
})();
