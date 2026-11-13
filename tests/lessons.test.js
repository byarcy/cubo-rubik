/* tests/lessons.test.js · Checks, without a browser, every lesson registered in COACH.LESSONS.
   Usage (from the project folder):   node tests/lessons.test.js
   When you add a new lesson this file doesn't need to change: it goes through every lesson that exists.

   For each lesson, 300 exercises solved from start to finish, choosing at random between the main plan and the
   equivalent routes (alt) of each step. It requires that:
     · the generated exercise is at the stage before the lesson and the lesson has something to do;
     · each step (main or alternative) leaves every already-placed piece of the lesson in its place;
     · the lesson ends (it never loops, and never says "broken");
     · when it ends, the lesson's stage is complete;
     · if its steps say which stage they work on (full solve), that stage never goes back.
   Now and then the whole cube is turned during an exercise (the centers move): the coach works against the centers,
   so the lesson must go on the same.
   Loop lessons (repeat until it comes back): the cube must come back after exactly the algorithm's repetitions.
   Quiz lessons (recognize the case): the answer is one of the options and the case is really on the cube. */
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..');
const src=['cube_logic.js','algorithms.js','methods.js','search.js','coach.js'].map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
const {CUBE,COACH,ALGORITHMS,METHODS}=new Function(src+';return {CUBE,COACH,ALGORITHMS,METHODS};')();
// Every case of every lesson has its message: "msg.<lesson>.<case>" in the reference language (the panel looks it up so)
const EN=JSON.parse(fs.readFileSync(path.join(dir,'locales','en.json'),'utf8'));
const missingMsg=new Set();
function msgCheck(lesson,kind){const k='msg.'+lesson+'.'+kind;if(!(k in EN)&&!missingMsg.has(k)){missingMsg.add(k);fail(lesson,'case '+kind+' has no message '+k+' in locales/en.json');}}
// Where the panel splits a plan into groups of turns: inside the plan, in order; the algorithms the guides split
// (second layer and last layer) must be recognized from any side
const GROUPED=/^(second(Right|Left|Take)|yCross|yEdges(Swap|Opposite)|yCorners)/;
// The yellow shape on top, read straight from the stickers (without the coach): only the center, a line or an L
// (on a copy turned as a whole until the centers are where they belong, so it works however the cube is held)
function yellowShape(){
  return CUBE.withSnapshot(()=>{
    const F=CUBE.frame();CUBE.apply(COACH.HOLDS.find(h=>h.F.every((c,i)=>c.every((v,j)=>v===F[j][i]))).seq);
    const at=CUBE.cube.filter(k=>CUBE.nz(k.p)===2&&k.c==='D'&&k.n[1]===-1).map(k=>k.p);
    if(!at.length)return 'yCrossDot';
    return at.length===2&&at[0][0]===-at[1][0]&&at[0][2]===-at[1][2]?'yCrossLine':'yCrossL';
  });
}
function shapeCheck(name,kind){
  if(/^yCross/.test(kind)&&yellowShape()!==kind)fail(name,'says '+kind+' and the cube shows '+yellowShape());
}
function groupCheck(name,kind,plan){
  const g=COACH.groupStarts(plan);
  if(g.some((v,i)=>v<=0||v>=plan.length||(i&&v<=g[i-1])))fail(name,'wrong groups '+JSON.stringify(g)+' for '+CUBE.seqText(plan));
  if(GROUPED.test(kind)&&plan.length>1&&!g.length)fail(name,'case '+kind+': the plan is not split into groups: '+CUBE.seqText(plan));
}
const rand=n=>Math.floor(Math.random()*n);
const N=300;
let errors=0;
const fail=(lesson,msg)=>{errors++;if(errors<=15)console.log('  ✗ ['+lesson+'] '+msg);};

function loopLesson(name,L){
  const used={};
  for(let i=0;i<N;i++){
    L.generate();
    let away=false,steps=0,total=null;
    for(;;){
      const e=L.step();
      if(e.broken){fail(name,'says "broken" while following the steps');break;}
      if(away&&CUBE.isSolved())break;
      if(total==null)total=e.total;
      if(e.reps!==steps){fail(name,'counts '+e.reps+' repetitions and they are '+steps);break;}
      if(++steps>total){fail(name,e.alg+' does not come back in '+total+' repetitions');break;}
      COACH.apply(e.plan);away=away||!CUBE.isSolved();
      // in the middle of a repetition it knows where you are
      const mid=L.step();
      if(mid.broken||mid.reps!==steps%total)fail(name,'lost after a whole repetition of '+e.alg);
    }
    if(steps!==total)fail(name,'came back after '+steps+' repetitions instead of '+total);
    used[L.step().alg]=total;
  }
  // half a repetition: the plan is the rest of it
  L.generate();const first=L.step();COACH.apply(first.plan.slice(0,2));
  const half=L.step();
  if(half.broken||half.plan.length!==first.plan.length-2)fail(name,'does not follow half a repetition');
  console.log((errors?'✗':'✓')+' '+name+': '+N+' exercises; algorithms and repetitions '+JSON.stringify(used));
}

function quizLesson(name,L){
  const seen={};
  for(let i=0;i<N;i++){
    if(!L.generate()){fail(name,'could not generate a case');continue;}
    const q=L.step();
    if(!q.options||!q.options.includes(q.answer)){fail(name,'the answer is not among the options');continue;}
    const again=COACH.LESSONS[q.lesson].step(q.id);
    if(again.kind!==q.answer)fail(name,'the cube shows '+again.kind+' and the answer is '+q.answer);
    shapeCheck(name,q.answer);msgCheck(q.lesson,q.answer);
    seen[q.answer]=(seen[q.answer]||0)+1;
  }
  console.log((errors?'✗':'✓')+' '+name+': '+N+' cases '+JSON.stringify(seen));
}

// Another way: when you leave the plan of a guided step, the coach looks at the cube (COACH.mark, where and settled).
// From the cube where step «e» starts, it requires that:
//   · following the plan, the cube is always where the plan says;
//   · the same turn made another way (three quarter turns the other way, two opposite faces in the other order) leaves
//     you on the plan, at the same turn;
//   · after leaving the plan with a few turns of any kind, if nothing that was in place is lost and the piece of the step
//     is in its place, the coach accepts it (it never answers "broken" there). Only for steps that place a piece: in
//     the others the lesson itself says what a tidy cube is (lesson 7 takes the cube apart on purpose).
// Now and then the exercise goes on from one of those accepted cubes: the lesson must end all the same (returns true).
const FACE_TURNS=['U','D','R','L','F','B'].flatMap(f=>[1,-1,2].map(n=>({f,n})));
function otherWay(name,L,e,current,stats){
  const P=e.plan,mk=COACH.mark(name,e),start=CUBE.snapshot();
  const back=()=>CUBE.applySnap(start);
  for(let j=0;j<=P.length;j++){
    back();COACH.apply(P.slice(0,j));
    const w=COACH.where(mk,P);
    if(w!==j){fail(name,'case "'+e.kind+'": after '+j+' turns of '+CUBE.seqText(P)+' the cube is said to be at turn '+w);break;}
  }
  // a quarter turn as three the other way
  const quarters=P.map((m,i)=>i).filter(i=>P[i].n!==2);
  if(quarters.length){
    const i=quarters[rand(quarters.length)],m={f:P[i].f,n:-P[i].n};
    back();COACH.apply([...P.slice(0,i),m,m,m]);
    if(COACH.where(mk,P)!==i+1)fail(name,'case "'+e.kind+'": '+CUBE.seqText([m,m,m])+' instead of '+CUBE.seqText([P[i]])+' is not seen as the same turn');
    stats.same++;
  }
  // two opposite faces in the other order
  const pairs=P.map((m,i)=>i).filter(i=>i+1<P.length&&CUBE.OPP[P[i].f]===P[i+1].f);
  if(pairs.length){
    const i=pairs[rand(pairs.length)];
    back();COACH.apply([...P.slice(0,i),P[i+1],P[i]]);
    if(COACH.where(mk,P)!==i+2)fail(name,'case "'+e.kind+'": '+CUBE.seqText([P[i+1],P[i]])+' instead of '+CUBE.seqText([P[i],P[i+1]])+' is not seen as the same');
    stats.same++;
  }
  // leaving the plan
  let stay=false;
  for(let t=0;t<4&&!stay;t++){
    back();COACH.apply(P.slice(0,rand(P.length)));
    const extra=[];for(let k=1+rand(3);k>0;k--)extra.push(FACE_TURNS[rand(FACE_TURNS.length)]);
    COACH.apply(extra);
    stats.left++;
    const ok=COACH.settled(name,mk,e.id||current);
    const reached=!!e.id&&mk.held.every(CUBE.pieceSolved)&&METHODS.stage(L.method)>=mk.stage&&CUBE.pieceSolved(e.id);
    if(reached&&!ok)fail(name,'case "'+e.kind+'": another way puts the piece in its place and it is not accepted ('+CUBE.seqText(extra)+')');
    if(ok){stats.accepted++;stay=Math.random()<0.25;}
  }
  if(!stay)back();
  return stay;
}

for(const name of Object.keys(COACH.LESSONS)){
  const L=COACH.LESSONS[name];
  if(L.loop){loopLesson(name,L);continue;}
  if(L.quiz){quizLesson(name,L);continue;}
  const MAX_STEPS=L.maxSteps||80;
  const stats={steps:0,withAlt:0,altUsed:0,turned:0,same:0,left:0,accepted:0,kinds:{}};
  for(let i=0;i<N;i++){
    if(!L.generate()){fail(name,'could not generate an exercise');continue;}
    if(METHODS.stage(L.method)!==L.stage)fail(name,'the exercise starts at stage '+METHODS.stage(L.method)+' and it should be '+L.stage);
    if(!L.step().plan)fail(name,'the generated exercise is already solved');
    let current=null,n=0,lastStage=-1;
    for(;;){
      // now and then the whole cube is turned (the centers move): the lesson must go on as if nothing happened
      if(Math.random()<0.15){CUBE.apply(COACH.HOLDS[1+rand(COACH.HOLDS.length-1)].seq);stats.turned++;}
      const e=L.step(current);
      if(e.broken){fail(name,'says "broken" in an exercise that followed the steps');break;}
      if(e.done)break;
      if(!e.plan||!e.plan.length){fail(name,'step without turns: '+JSON.stringify(e));break;}
      if(++n>MAX_STEPS){fail(name,'does not end in '+MAX_STEPS+' steps');break;}
      if(e.stage!=null){if(e.stage<lastStage)fail(name,'went back from stage '+lastStage+' to '+e.stage);lastStage=e.stage;}
      stats.steps++;stats.kinds[e.kind]=(stats.kinds[e.kind]||0)+1;msgCheck(e.lesson||name,e.kind);
      shapeCheck(name,e.kind);
      // (in one step out of four; in a whole solve, with its many steps, one out of twenty)
      if(Math.random()<(L.solve?0.05:0.25)&&otherWay(name,L,e,current,stats))continue;
      const routes=[e.plan,...(e.alt||[])];
      if(e.alt&&e.alt.length)stats.withAlt++;
      // each route, on its own, must keep the invariant starting from this same cube
      const snap=CUBE.snapshot(),before=L.pieces().filter(CUBE.pieceSolved);
      routes.forEach((r,k)=>{
        groupCheck(name,e.kind,r);
        COACH.apply(r);
        for(const id of before)if(!CUBE.pieceSolved(id)){fail(name,(k?'alternative route':'plan')+' of case "'+e.kind+'" takes piece '+id+' out of its place: '+CUBE.seqText(r));break;}
        CUBE.applySnap(snap);
      });
      const k=rand(routes.length);if(k>0)stats.altUsed++;
      COACH.apply(routes[k]);current=e.id;
    }
    if(METHODS.stage(L.method)<=L.stage)fail(name,'when finished, stage '+(L.stage+1)+' is not complete');
  }
  console.log((errors?'✗':'✓')+' '+name+': '+N+' exercises, '+(stats.steps/N).toFixed(1)+' steps each; whole cube turned '+stats.turned+' times; steps with alternative routes: '+stats.withAlt+', alternatives used: '+stats.altUsed+'; another way: '+stats.same+' same turns seen, left the plan '+stats.left+' times, accepted '+stats.accepted+'; cases '+JSON.stringify(stats.kinds));
}
// The groups of turns of each algorithm add up to its length
for(const [n,A] of Object.entries(ALGORITHMS.layers))
  if(A.groups&&A.groups.reduce((a,b)=>a+b,0)!==CUBE.parseSeq(A.seq).length)fail('algorithms',n+': its groups do not add up to its turns');
// The methods the app offers: always the default one, and never a draft (the tests still go through every lesson)
if(!METHODS.OPEN.includes(METHODS.DEFAULT))fail('methods','the default method is not offered');
for(const id of METHODS.OPEN)if(METHODS.ALL[id].draft)fail('methods',id+' is a draft and the app offers it');
console.log(errors?'\n'+errors+' errors':'\nAll good');
process.exit(errors?1:0);
