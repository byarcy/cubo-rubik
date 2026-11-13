/* coach.js · The "teacher" of Practice mode: looks at the cube and says which piece is next and with which turns.
   Logic only: it draws nothing and knows nothing about the interface. Uses CUBE (cube_logic.js), ALGORITHMS (algorithms.js)
   METHODS (methods.js: the stages of each method and the order of its lessons) and SEARCH (search.js: the shortest
   ways for the CFOP cross and F2L pairs).
   Everything is expressed in model faces (white = U, yellow = D); the interface translates it to how the cube looks.
   Exposes a single global object: COACH. */
const COACH=(function(){
const {key,FACE_OF,parseSeq}=CUBE;
const LAYERS=METHODS.get('layers'),stage=()=>METHODS.stage('layers');
// The four slots of the white layer, in the order you go through them by turning the cube around its vertical axis
const CORNER_SLOTS=['1,1,1','-1,1,1','-1,1,-1','1,1,-1'];
const ROT={R:'F',F:'L',L:'B',B:'R',U:'U',D:'D'};
// Moves a sequence written for the U-R-F slot to slot k
function rotateToSlot(seq,k){
  return seq.map(m=>{let f=m.f;for(let i=0;i<k;i++)f=ROT[f];return {f,n:m.n};});
}
// Turns the cube for real (to prepare exercises). To only try turns, use CUBE.withSnapshot: the cube is always left as it
// was, even if something fails in the middle.
const apply=CUBE.apply;
// (each text is read once: the turns are kept and rotateToSlot makes a new list every time)
const PARSED={};
const algoSeq=(name,k)=>rotateToSlot(PARSED[name]||(PARSED[name]=parseSeq(ALGORITHMS.layers[name].seq)),k);
const rand=n=>Math.floor(Math.random()*n);
// Where each group of turns starts in a plan (positions after the first one), when the plan is one of the method's
// algorithms: from any side, done once or twice, or with its first turns already done, however the cube is held.
// [] if it isn't one.
let GROUPS=null;
function groupStarts(plan){
  // every variant of every algorithm (from each side, once or twice, from each of its turns): its text → group starts
  if(!GROUPS){
    GROUPS=new Map();
    for(const [method,name] of [...Object.keys(ALGORITHMS.layers).map(n=>['layers',n]),...Object.keys(ALGORITHMS.cfop).map(n=>['cfop',n])]){
      const A=ALGORITHMS[method][name],sizes=A.groups||[parseSeq(A.seq).length];
      for(let r=0;r<4;r++)for(let c=1;c<=2;c++){
        const one=method==='cfop'?cfopSeq(name,r):rotateToSlot(parseSeq(A.seq),r);
        const full=[];for(let k=0;k<c;k++)full.push(...one);
        for(let j=0;j<full.length;j++){
          const t=CUBE.seqText(full.slice(j));if(GROUPS.has(t))continue;
          const starts=[];let pos=0;
          for(let k=0;k<c;k++)for(const sz of sizes){if(pos>j)starts.push(pos-j);pos+=sz;}
          GROUPS.set(t,starts);
        }
      }
    }
  }
  // with the cube held another way (the centers moved), the same algorithm turns other faces: every way is tried
  for(const h of HOLDS){const t=CUBE.seqText(realSeq(h.F,plan));if(GROUPS.has(t))return GROUPS.get(t);}
  return [];
}

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
  return CUBE.withSnapshot(()=>{apply(plan);return goal();});
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
  return CUBE.withSnapshot(()=>{
    let c=0;
    do{CUBE.quarter('D',1);c++;}while(c<4&&(CUBE.byId[id][0].p[0]!==h[0]||CUBE.byId[id][0].p[2]!==h[2]));
    return c===3?-1:c;
  });
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
  if(!LAYERS.stages[0].ok())return {broken:true};
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
  const reach=(r,d)=>CUBE.withSnapshot(()=>{apply(seqs[r]);return d===1?goal():[0,1,2,3].some(r2=>reach(r2,d-1));});
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
  return CUBE.withSnapshot(()=>{
    const out=[];
    for(let k=0;k<4;k++){out.push(count());CUBE.quarter('D',1);}
    return out;
  });
}
const turnOf=k=>k===3?-1:k;

// The yellow shape on top from the yellow edges that point up: only the center, an L or a line. The shape is where those
// edges are now (not where they belong): two on opposite sides make a line.
function crossShape(up){
  const at=up.map(id=>CUBE.byId[id][0].p);
  return up.length===0?'yCrossDot':up.length===2&&at[0][0]===-at[1][0]&&at[0][2]===-at[1][2]?'yCrossLine':'yCrossL';
}
// ---- 4 · Yellow cross: the four yellow edges pointing up (yellow side), in any place ----
//   yCrossDot / yCrossL / yCrossLine · the shape on top before the algorithm (only the center / an L / a line)
function yellowCross(){
  if(!MIDDLE_DONE())return {broken:true};
  const up=YELLOW_EDGES.filter(edgeUp);
  if(up.length===4)return {done:true};
  const kind=crossShape(up);
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

// ---- 7 · Yellow corners turned: the guide's last step ----
// Always the same corner spot (WORK_SPOT: front-top-right with yellow on top) and the same side facing you:
// twist the corner there with yellowTwist ×2 until yellow faces up, then turn only the yellow layer to bring the next
// corner to the spot. In between, the rest of the cube looks messed up: only yellowTwist touches it, so the state is
// valid if undoing some repetitions of yellowTwist (0 to 5) puts the first two layers back (that number is «m»).
//   yTurnTwist  · the corner in the spot needs turning, and the rest of the cube is still tidy
//   yTurnKeep   · the corner in the spot needs turning, the rest is messed up (normal: keep going)
//   yTurnHalf   · an odd number of yellowTwist was done (only possible without the guide): finish the pair
//   yTurnNext   · the corner in the spot is right: turn the yellow layer to bring one that isn't
//   yTurnFinish · every corner is right and the rest came back: a turn of the yellow layer finishes the cube
// The lesson always uses the spot of side 0; without the guide (full solve, no help) you may have chosen another side:
// side r is the same spot and the same algorithm turned with rotateToSlot (the spot is where faces L and F meet D).
const TWIST=(r=0)=>algoSeq('yellowTwist',r);
const spotOf=r=>{const [l,f]=rotateToSlot([{f:'L'},{f:'F'}],r).map(m=>CUBE.FACE_DIR[m.f]);return key([l[0]+f[0],-1,l[2]+f[2]]);};
const WORK_SPOT=spotOf(0);
const yellowDown=id=>CUBE.byId[id].find(k=>k.hn[1]===-1).n[1]===-1;     // id: a yellow corner (by its solved place)
const cornerAt=pos=>YELLOW_CORNERS.find(id=>key(CUBE.byId[id][0].p)===pos);
const firstTwoLayers=()=>whiteLayerSolved()&&MIDDLE_EDGES.every(CUBE.pieceSolved);
// How many yellowTwist (m, 0 to 5) from which side (r) have to be undone to get the first two layers back;
// m = -1 if none works. With m = 0 the side is free (nothing is messed up): side 0.
function twistsDone(){
  if(firstTwoLayers())return {m:0,r:0};
  for(let m=1;m<6;m++)for(let r=0;r<4;r++){
    const ok=CUBE.withSnapshot(()=>{for(let i=0;i<m;i++)apply(CUBE.invSeq(TWIST(r)));return firstTwoLayers();});
    if(ok)return {m,r};
  }
  return {m:-1,r:0};
}
function yellowCornersTurn(){
  if(CUBE.isSolved())return {done:true};
  const {m,r}=twistsDone(),place=spotOf(r),spot=cornerAt(place);
  if(m<0)return {broken:true};
  const extra={slot:place,focus:spot?[spot]:[],keepView:true};
  if(m%2)return Object.assign({kind:'yTurnHalf',plan:TWIST(r),cost:0},extra);
  if(!spot)return {broken:true};
  if(!yellowDown(spot))return Object.assign({kind:m?'yTurnKeep':'yTurnTwist',plan:[...TWIST(r),...TWIST(r)],cost:0},extra);
  const all=YELLOW_CORNERS.every(yellowDown);
  if(all&&m)return {broken:true};
  // the turn of the yellow layer: the nearest one that brings a corner still to be turned (or, at the end, solves the cube)
  const want=all?()=>CUBE.isSolved():()=>!yellowDown(cornerAt(place));
  const ok=afterTurns(()=>want()?1:0);
  const k=[1,3,2].find(i=>ok[i]);
  if(k===undefined)return {broken:true};
  const n=turnOf(k);
  return Object.assign({kind:all?'yTurnFinish':'yTurnNext',plan:[{f:'D',n}],cost:0,alt:alignD(n)},extra);
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
function generateLastLayer(want,before){
  for(let attempt=0;attempt<60;attempt++){
    scrambleLastLayer();
    if(before.every(solveWith)&&stage()===want)return true;
  }
  return false;
}

// ================= Full solve =================
// A normal scramble, solved stage by stage with the seven lessons: the coach looks at which stage the cube is at and
// asks that lesson for the step. The interface only shows it when you ask for a hint.
const METHOD=LAYERS.lessons;
// In the middle of the last step the first layers look messed up on purpose: it is still the last step if undoing the
// twists (and turning the yellow layer) leaves every corner in place
function inLastStep(){
  const {m,r}=twistsDone();
  if(m<0)return false;
  return CUBE.withSnapshot(()=>{
    for(let i=0;i<m;i++)apply(CUBE.invSeq(TWIST(r)));
    return afterTurns(()=>stage()>=6?1:0).some(Boolean);
  });
}
// The stage the cube is at (0 to 6), or 7 when it is solved
function solveStage(){
  if(CUBE.isSolved())return 7;
  return inLastStep()?6:stage();
}
// The step of the lesson of that stage, plus: stage, lesson (which lesson it comes from) and yellowUp (how to show it)
function solve(current){
  const s=solveStage();
  if(s===7)return {done:true};
  const lesson=METHOD[s],e=LESSONS[lesson].step(current);
  return Object.assign({},e,{stage:s,lesson,yellowUp:!!LESSONS[lesson].yellowUp});
}

// ================= Repeat until it comes back =================
// Starting from a solved cube, the same algorithm again and again: the cube comes apart and, after a few repetitions
// (6 for most of them), it comes back by itself. It is for learning an algorithm by heart and trusting it.
const REPEAT_LAYERS=[
  {alg:'yellowTwist',yellowUp:true},{alg:'yellowCross',yellowUp:true},{alg:'yellowEdges',yellowUp:true},
  {alg:'yellowCorners',yellowUp:true},{alg:'cornerOut',yellowUp:false}
];
const orders={};
// How many repetitions bring the solved cube back (method: whose algorithm it is)
function orderOf(name,method='layers'){
  const id=method+'.'+name;
  if(!orders[id]){
    const seq=modelSeq(method,name);
    orders[id]=CUBE.withSnapshot(()=>{CUBE.resetLogic();let n=0;do{apply(seq);n++;}while(!CUBE.isSolved()&&n<200);return n;});
  }
  return orders[id];
}
// A Repeat lesson for a list of algorithms ({alg, method, yellowUp}); each exercise picks one (not the same twice in a row).
// The step says where you are: «reps» whole repetitions plus the first «j» turns of the next one (undoing them gives the
// solved cube).
function makeRepeat(list){
  let pick=0;
  function step(){
    const R=list[pick],method=R.method||'layers',seq=modelSeq(method,R.alg),total=orderOf(R.alg,method),undo=CUBE.invSeq(seq);
    let found=null;
    for(let j=0;j<seq.length&&!found;j++)found=CUBE.withSnapshot(()=>{
      apply(CUBE.invSeq(seq.slice(0,j)));
      for(let reps=0;reps<total;reps++){if(CUBE.isSolved())return {reps,j};apply(undo);}
      return null;
    });
    if(!found)return {broken:true};
    return {kind:'repeat',plan:seq.slice(found.j),cost:0,alt:[],reps:found.reps,total,alg:R.alg,yellowUp:R.yellowUp,keepView:true,stage:0};
  }
  function generate(){
    let k;do{k=rand(list.length);}while(k===pick&&list.length>1);
    pick=k;CUBE.resetLogic();return true;
  }
  return {step,generate};
}

// ================= Recognize the case =================
// The cube shows a case of one lesson and you choose which one it is among 2 or 3 options; then the app shows its turns.
// focus: what to light up, when the lesson's own focus would give the answer away
const yellowLayer=()=>[...YELLOW_EDGES,...YELLOW_CORNERS,'0,-1,0'];
const QUIZ_LAYERS=[
  {lesson:'cross',kinds:['crossUp','crossFlipped']},
  {lesson:'corners',kinds:['cornerRight','cornerFront','cornerOut']},
  {lesson:'secondLayer',kinds:['secondRight','secondLeft']},
  {lesson:'yellowCross',kinds:['yCrossDot','yCrossL','yCrossLine'],focus:yellowLayer},
  {lesson:'yellowEdges',kinds:['yEdgesSwap','yEdgesOpposite'],focus:yellowLayer},
  {lesson:'yellowCornersPlace',kinds:['yCornersNone','yCornersCycle'],focus:yellowLayer}
];
// A Recognize lesson for a list of families (a lesson and its cases). Each exercise chooses a family (not the same one
// twice in a row) and an answer, and follows that lesson's exercise until the case shows up. With more than three cases,
// the options are the answer and two others, so the buttons fit.
function makeQuiz(families){
  let quizCase=null,last=-1;
  function generate(){
    let f;do{f=rand(families.length);}while(f===last&&families.length>1);
    const F=families[f],L=LESSONS[F.lesson],want=F.kinds[rand(F.kinds.length)];
    let options=F.kinds;
    if(options.length>3){const others=options.filter(k=>k!==want);const keep=new Set([want]);while(keep.size<3)keep.add(others[rand(others.length)]);options=options.filter(k=>keep.has(k));}
    for(let attempt=0;attempt<200;attempt++){
      if(!L.generate())continue;
      let current=null;
      for(let i=0;i<60;i++){
        const e=L.step(current);
        if(!e.plan)break;
        if(e.kind===want){
          last=f;
          quizCase=Object.assign({},e,{lesson:F.lesson,options,answer:e.kind,yellowUp:!!L.yellowUp,stage:0});
          if(F.focus)quizCase.focus=F.focus();
          return true;
        }
        apply(e.plan);current=e.id;
      }
    }
    return false;
  }
  return {step:()=>quizCase||{},generate};
}

// ================= CFOP · the last layer in two looks =================
// The algorithms of ALGORITHMS.cfop are written as the guides write them, with yellow on top: OVER turns them to model
// faces (the cube turned over: R↔L, U↔D) and SIDE tries them from the four sides (R→F→L→B, as rotateToSlot). Both
// tables cover every turn of CUBE.TURNS (a middle layer or the whole cube may change direction), although the
// algorithms used today only turn faces, so that every one can be made by dragging a face.
const OVER={R:['L',1],L:['R',1],U:['D',1],D:['U',1],F:['F',1],B:['B',1],r:['l',1],l:['r',1],u:['d',1],d:['u',1],f:['f',1],b:['b',1],
  Rw:['Lw',1],Lw:['Rw',1],Uw:['Dw',1],Dw:['Uw',1],Fw:['Fw',1],Bw:['Bw',1],M:['M',-1],E:['E',-1],S:['S',1],x:['x',-1],y:['y',-1],z:['z',1]};
const SIDE={R:['F',1],F:['L',1],L:['B',1],B:['R',1],U:['U',1],D:['D',1],r:['f',1],f:['l',1],l:['b',1],b:['r',1],u:['u',1],d:['d',1],
  Rw:['Fw',1],Fw:['Lw',1],Lw:['Bw',1],Bw:['Rw',1],Uw:['Uw',1],Dw:['Dw',1],M:['S',-1],S:['M',1],E:['E',1],x:['z',1],z:['x',-1],y:['y',1]};
const remap=(T,seq)=>seq.map(m=>{const [f,k]=T[m.f];return {f,n:m.n===2?2:m.n*k};});
// A CFOP algorithm in model faces, from side k (0 to 3)
const CFOP_SEQ={};
function cfopSeq(name,k=0){
  const id=name+k;
  if(!CFOP_SEQ[id]){let q=remap(OVER,parseSeq(ALGORITHMS.cfop[name].seq));for(let i=0;i<k;i++)q=remap(SIDE,q);CFOP_SEQ[id]=q;}
  return CFOP_SEQ[id].slice();
}
// Any algorithm of a method in model faces, as written (for Help · Algorithms)
const modelSeq=(method,name)=>method==='cfop'?cfopSeq(name):algoSeq(name,0);
const cfopStage=()=>METHODS.stage('cfop');
// The routes that start a shortest solution of «goal» with these algorithms (each from the four sides), looking up to
// «depth» algorithms ahead; each route says which algorithm it is (name)
function shortestOf(names,goal,depth){
  const routes=names.flatMap(name=>[0,1,2,3].map(k=>({name,seq:cfopSeq(name,k)})));
  const reach=(q,d)=>CUBE.withSnapshot(()=>{apply(q.seq);return d===1?goal():routes.some(q2=>reach(q2,d-1));});
  for(let d=1;d<=depth;d++){const f=routes.filter(q=>reach(q,d));if(f.length)return f;}
  return [];
}
// The step: the first route is the plan, the others are equivalent routes; the case is the algorithm, unless given
const viaRoutes=(kind,routes,extra)=>routes.length?Object.assign({kind:kind||routes[0].name,plan:routes[0].seq,cost:0,alt:routes.slice(1).map(q=>q.seq)},extra):{broken:true};
const OLL_CORNERS=['sune','antisune','ollH','pi','headlights','ollT','bowtie'];
const yellowFace=()=>YELLOW_EDGES.every(edgeUp)&&YELLOW_CORNERS.every(yellowDown);
const llCornersIn=()=>YELLOW_CORNERS.every(CUBE.pieceSolved);
// a turn of the yellow layer that makes «goal» true (1, 2 or -1), or 0 if none does
const turnFor=goal=>{const k=afterTurns(()=>goal()?1:0).findIndex((v,i)=>i>0&&v);return k<0?0:turnOf(k);};

// ---- OLL 1 · The yellow cross with two algorithms: the line and the L each in one go (only the center: both) ----
function ollEdges(){
  if(!MIDDLE_DONE())return {broken:true};
  const up=YELLOW_EDGES.filter(edgeUp);
  if(up.length===4)return {done:true};
  return viaRoutes(crossShape(up),shortestOf(['ollLine','ollL'],()=>YELLOW_EDGES.every(edgeUp),2),{focus:[...up,'0,-1,0']});
}
// ---- OLL 2 · The yellow face: one of seven algorithms, chosen by where the yellow of the corners points ----
function ollCorners(){
  if(!MIDDLE_DONE()||!YELLOW_EDGES.every(edgeUp))return {broken:true};
  if(yellowFace())return {done:true};
  return viaRoutes(null,shortestOf(OLL_CORNERS,yellowFace,1),{focus:yellowLayer()});
}
// ---- PLL 1 · The corners in their places: two neighbors swapped (T perm) or two on a diagonal (Y perm) ----
//   align · the corners are right among themselves: a turn of the yellow layer puts them in place
function pllCorners(){
  if(!MIDDLE_DONE()||!yellowFace())return {broken:true};
  if(llCornersIn())return {done:true};
  const n=turnFor(llCornersIn);
  if(n)return {kind:'align',plan:[{f:'D',n}],cost:0,alt:alignD(n),focus:YELLOW_CORNERS};
  return viaRoutes(null,shortestOf(['tPerm','yPerm'],()=>llCornersIn()||!!turnFor(llCornersIn),1),{focus:YELLOW_CORNERS});
}
// ---- PLL 2 · The edges: three around (U perm, one way or the other) or two pairs swapped (H perm, Z perm) ----
function pllEdges(){
  if(!MIDDLE_DONE()||!yellowFace()||!llCornersIn())return {broken:true};
  if(CUBE.isSolved())return {done:true};
  return viaRoutes(null,shortestOf(['ua','ub','hPerm','zPerm'],()=>CUBE.isSolved(),1),{focus:YELLOW_EDGES.filter(CUBE.pieceSolved)});
}
// Exercises: a solved cube, the last layer scrambled with these algorithms, and the earlier steps solved by the coach
function generateCfop(want,before){
  const all=Object.keys(ALGORITHMS.cfop);
  for(let attempt=0;attempt<80;attempt++){
    CUBE.resetLogic();
    for(let i=0;i<14;i++){apply(cfopSeq(all[rand(all.length)],rand(4)));apply([{f:'D',n:[1,-1,2][rand(3)]}]);}
    if(before.every(solveWith)&&cfopStage()===want)return true;
  }
  return false;
}
const F2L_PIECES=()=>[...CROSS_EDGES,...CORNER_SLOTS,...MIDDLE_EDGES];

// ================= CFOP · the cross and F2L =================
// No recipe: SEARCH finds the shortest way. The cross is made all at once, at the bottom (white down, yellow on top), in
// the fewest turns (8 or fewer always do); F2L, one corner-and-edge pair at a time, the one that goes in with the fewest
// turns without breaking the cross or the pairs already in.
function cfopCross(){
  const routes=SEARCH.crossRoutes();
  if(!routes.length)return {done:true};
  return {kind:'crossPlan',plan:routes[0],alt:routes.slice(1),cost:0,focus:[...CROSS_EDGES,'0,1,0']};
}
function f2lStep(){
  if(SEARCH.crossDistance()!==0)return {broken:true};
  const next=SEARCH.f2lNext();
  if(!next)return {done:true};
  const [corner,edge]=SEARCH.PAIRS[next.slot];
  // the corner is the piece (its slot is framed); its edge is lit with it
  return {id:corner,kind:'f2lPair',plan:next.route,alt:[],cost:0,focus:[edge]};
}
// Exercises: a scrambled cube (the cross takes at least 3 turns), or one with the cross already made
function generateCfopCross(){
  for(let attempt=0;attempt<50;attempt++){
    CUBE.resetLogic();apply(CUBE.genScramble(25));
    if(SEARCH.crossDistance()>=3&&cfopStage()===0)return true;
  }
  return false;
}
function generateF2L(){
  for(let attempt=0;attempt<50;attempt++){
    CUBE.resetLogic();apply(CUBE.genScramble(25));
    const r=SEARCH.crossRoutes();if(r.length)apply(r[0]);
    if(cfopStage()===1)return true;
  }
  return false;
}

// ================= CFOP · full solve, repeat and recognize =================
// Full solve: the stage the cube is at says which of the six lessons gives the step (only shown when you ask for a hint)
function cfopSolve(current){
  const st=cfopStage();
  if(st===6)return {done:true};
  const lesson=METHODS.get('cfop').lessons[st],e=LESSONS[lesson].step(current);
  return Object.assign({},e,{stage:st,lesson,yellowUp:true});
}
const REPEAT_CFOP=Object.keys(ALGORITHMS.cfop).map(alg=>({alg,method:'cfop',yellowUp:true}));
const QUIZ_CFOP=[
  {lesson:'ollEdges',kinds:['yCrossDot','yCrossL','yCrossLine'],focus:yellowLayer},
  {lesson:'ollCorners',kinds:OLL_CORNERS,focus:yellowLayer},
  {lesson:'pllCorners',kinds:['tPerm','yPerm'],focus:yellowLayer},
  {lesson:'pllEdges',kinds:['ua','ub','hPerm','zPerm'],focus:yellowLayer}
];
const repeatLayers=makeRepeat(REPEAT_LAYERS),repeatCfop=makeRepeat(REPEAT_CFOP);
const quizLayers=makeQuiz(QUIZ_LAYERS),quizCfop=makeQuiz(QUIZ_CFOP);

// Lessons of Practice mode. step(current) says which piece is next, with which turns and which equivalent routes exist;
// generate() prepares an exercise. To add a lesson: add it here and run tests/lessons.test.js.
// pieces: the ones the lesson places; once one is placed, no step may take it out of its place again
// A step may also say: stage (the stage being worked on, for the stage bar), lesson (whose case it is, for the messages)
// and yellowUp (how to show it); without them, the lesson's own values count.
// Other kinds of lesson: loop (it starts and ends solved: the step is never "done", the interface ends it when the
// cube comes back) and quiz (nothing is turned: step() gives the case to recognize), and solve: a whole cube, where the
// interface only shows the step when you ask for a hint.
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
    pieces:()=>[...CROSS_EDGES,...CORNER_SLOTS,...MIDDLE_EDGES,...YELLOW_EDGES]},
  // in the middle of this lesson the solved part comes apart on purpose, so no piece is required to stay in place
  yellowCornersTurn:{stage:6,step:yellowCornersTurn,generate:()=>generateLastLayer(6,[yellowCross,yellowEdges,yellowCornersPlace]),
    yellowUp:true,pieces:()=>[]},
  // the whole cube: the stages get done and undone along the way, so no piece is required to stay
  solve:{stage:0,step:solve,generate:generateCross,pieces:()=>[],maxSteps:200,solve:true},
  repeat:{stage:0,step:repeatLayers.step,generate:repeatLayers.generate,pieces:()=>[],loop:true},
  recognize:{stage:0,step:quizLayers.step,generate:quizLayers.generate,pieces:()=>[],quiz:true},
  // CFOP (method: which one they belong to; the stages are those of methods.js)
  cfopSolve:{method:'cfop',stage:0,step:cfopSolve,generate:generateCfopCross,yellowUp:true,pieces:()=>[],maxSteps:200,solve:true},
  cfopRepeat:{method:'cfop',stage:0,step:repeatCfop.step,generate:repeatCfop.generate,pieces:()=>[],loop:true},
  cfopRecognize:{method:'cfop',stage:0,step:quizCfop.step,generate:quizCfop.generate,pieces:()=>[],quiz:true},
  cfopCross:{method:'cfop',stage:0,step:cfopCross,generate:generateCfopCross,yellowUp:true,pieces:()=>CROSS_EDGES},
  // in F2L a lone corner or edge may move on the way: what must stay is the cross and every complete pair
  f2l:{method:'cfop',stage:1,step:f2lStep,generate:generateF2L,yellowUp:true,
    pieces:()=>[...CROSS_EDGES,...SEARCH.PAIRS.filter(p=>p.every(CUBE.pieceSolved)).flat()]},
  ollEdges:{method:'cfop',stage:2,step:ollEdges,generate:()=>generateCfop(2,[]),yellowUp:true,pieces:F2L_PIECES},
  ollCorners:{method:'cfop',stage:3,step:ollCorners,generate:()=>generateCfop(3,[ollEdges]),yellowUp:true,pieces:F2L_PIECES},
  pllCorners:{method:'cfop',stage:4,step:pllCorners,generate:()=>generateCfop(4,[ollEdges,ollCorners]),yellowUp:true,pieces:F2L_PIECES},
  pllEdges:{method:'cfop',stage:5,step:pllEdges,generate:()=>generateCfop(5,[ollEdges,ollCorners,pllCorners]),yellowUp:true,
    pieces:()=>[...F2L_PIECES(),...YELLOW_CORNERS]}
};

// ================= Measured against the centers =================
// The lessons are written with the centers where they belong (white = U, yellow = D). If the centers have moved (a middle
// layer, two layers or the whole cube turned in the model; on the 2×2, the corner taken as reference), the step is worked
// out on a copy of the cube turned as a whole until they are back, and its answer is turned back: each turn goes to the
// face where that center is now, and a spot (slot) to where it is now. Pieces are named by what they are (their solved
// place), so ids, focus and colors don't change.
const tm=(F,v)=>[F[0][0]*v[0]+F[1][0]*v[1]+F[2][0]*v[2],F[0][1]*v[0]+F[1][1]*v[1]+F[2][1]*v[2],F[0][2]*v[0]+F[1][2]*v[1]+F[2][2]*v[2]];
const isIdentity=F=>F.every((c,i)=>c.every((v,j)=>v===(i===j?1:0)));
// The 24 ways of holding the cube, each as turns of the whole cube (x, y, z) and the frame they give from the solved cube
const HOLDS=CUBE.withSnapshot(()=>{
  const out=[],seen=new Set(),queue=[[]];
  while(queue.length){
    const seq=queue.shift();CUBE.resetLogic();apply(seq);
    const F=CUBE.frame().map(c=>c.slice()),k=JSON.stringify(F);
    if(seen.has(k))continue;
    seen.add(k);out.push({seq,F});
    for(const f of ['x','y','z'])queue.push([...seq,{f,n:1}]);
  }
  return out;
});
// The whole-cube turns that bring the frame F back to the solved one (F turned back: its transpose)
const backTo=F=>HOLDS.find(h=>h.F.every((c,i)=>c.every((v,j)=>v===F[j][i]))).seq;
const realFace=(F,f)=>CUBE.MOVES[f]?FACE_OF[key(tm(F,CUBE.FACE_DIR[f]))]:f;
const realSeq=(F,q)=>q&&q.map(m=>({f:realFace(F,m.f),n:m.n}));
function againstCenters(step,current){
  const F=CUBE.frame().map(c=>c.slice());
  if(isIdentity(F))return step(current);
  return CUBE.withSnapshot(()=>{
    apply(backTo(F));
    const e=step(current);
    if(!e||!e.plan)return e;
    return Object.assign({},e,{plan:realSeq(F,e.plan),alt:(e.alt||[]).map(q=>realSeq(F,q)),
      slot:e.slot?key(tm(F,e.slot.split(',').map(Number))):e.slot});
  });
}
for(const L of Object.values(LESSONS)){const own=L.step;L.step=current=>againstCenters(own,current);}

// ================= Another way: following a step by looking at the cube =================
// The interface follows a guided step turn by turn, by its letters. When you leave the plan, these look at the cube
// instead, so that another way of getting there counts as much as the plan's:
//   mark(name, e)        what to remember when step «e» starts: the cube, the stage (the real one and the one the step
//                        works on) and the pieces already in place
//   where(mark, plan)    how many turns of the plan the cube has now (0 to plan.length), or -1 if it is not on the plan
//                        (three quarter turns the other way, two opposite faces in the other order…)
//   settled(name, mark, current)   nothing that was in place when the step started is lost, and the coach knows how
//                        to go on from here: it can look at the cube again instead of asking you to undo
function mark(name,e){
  const L=LESSONS[name],own=LESSONS[e&&e.lesson||name]||L;
  return {snap:CUBE.snapshot(),stage:METHODS.stage(L.method),step:e&&e.stage!=null?e.stage:null,held:own.pieces().filter(CUBE.pieceSolved)};
}
function where(mk,plan){
  const now=JSON.stringify(CUBE.snapshot());
  return CUBE.withSnapshot(()=>{
    if(!CUBE.applySnap(mk.snap))return -1;
    for(let j=0;;j++){
      if(JSON.stringify(CUBE.snapshot())===now)return j;
      if(j>=plan.length)return -1;
      apply([plan[j]]);
    }
  });
}
function settled(name,mk,current){
  const L=LESSONS[name];
  if(!mk.held.every(CUBE.pieceSolved))return false;
  // (a loop lesson leaves the solved cube on purpose: its step says whether the cube is still on the algorithm)
  if(!L.loop&&METHODS.stage(L.method)<mk.stage)return false;
  // (a whole solve never says "broken": from any cube it starts again. Going back to an earlier stage is a loss too)
  const e=L.step(current);
  return !e.broken&&!(mk.step!=null&&e.stage!=null&&e.stage<mk.step);
}

return {mark,where,settled,METHOD,solveStage,orderOf,groupStarts,modelSeq,HOLDS,CORNER_SLOTS,CROSS_EDGES,MIDDLE_EDGES,YELLOW_EDGES,YELLOW_CORNERS,LESSONS,middleCase,secondLayer,generateSecond,
  yellowCross,yellowEdges,yellowCornersPlace,rotateToSlot,apply,cornerCase,corners,solveCorners,generateCorners,edgeCase,cross,generateCross};
})();
