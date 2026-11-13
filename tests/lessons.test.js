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
   Loop lessons (repeat until it comes back): the cube must come back after exactly the algorithm's repetitions.
   Quiz lessons (recognize the case): the answer is one of the options and the case is really on the cube. */
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..');
const src=['cube_logic.js','algorithms.js','coach.js'].map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
const {CUBE,COACH}=new Function(src+';return {CUBE,COACH};')();
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
    seen[q.answer]=(seen[q.answer]||0)+1;
  }
  console.log((errors?'✗':'✓')+' '+name+': '+N+' cases '+JSON.stringify(seen));
}

for(const name of Object.keys(COACH.LESSONS)){
  const L=COACH.LESSONS[name];
  if(L.loop){loopLesson(name,L);continue;}
  if(L.quiz){quizLesson(name,L);continue;}
  const MAX_STEPS=L.maxSteps||80;
  const stats={steps:0,withAlt:0,altUsed:0,kinds:{}};
  for(let i=0;i<N;i++){
    if(!L.generate()){fail(name,'could not generate an exercise');continue;}
    if(CUBE.stage()!==L.stage)fail(name,'the exercise starts at stage '+CUBE.stage()+' and it should be '+L.stage);
    if(!L.step().plan)fail(name,'the generated exercise is already solved');
    let current=null,n=0,lastStage=-1;
    for(;;){
      const e=L.step(current);
      if(e.broken){fail(name,'says "broken" in an exercise that followed the steps');break;}
      if(e.done)break;
      if(!e.plan||!e.plan.length){fail(name,'step without turns: '+JSON.stringify(e));break;}
      if(++n>MAX_STEPS){fail(name,'does not end in '+MAX_STEPS+' steps');break;}
      if(e.stage!=null){if(e.stage<lastStage)fail(name,'went back from stage '+lastStage+' to '+e.stage);lastStage=e.stage;}
      stats.steps++;stats.kinds[e.kind]=(stats.kinds[e.kind]||0)+1;
      const routes=[e.plan,...(e.alt||[])];
      if(e.alt&&e.alt.length)stats.withAlt++;
      // each route, on its own, must keep the invariant starting from this same cube
      const snap=CUBE.snapshot(),before=L.pieces().filter(CUBE.pieceSolved);
      routes.forEach((r,k)=>{
        COACH.apply(r);
        for(const id of before)if(!CUBE.pieceSolved(id)){fail(name,(k?'alternative route':'plan')+' of case "'+e.kind+'" takes piece '+id+' out of its place: '+CUBE.seqText(r));break;}
        CUBE.applySnap(snap);
      });
      const k=rand(routes.length);if(k>0)stats.altUsed++;
      COACH.apply(routes[k]);current=e.id;
    }
    if(CUBE.stage()<=L.stage)fail(name,'when finished, stage '+(L.stage+1)+' is not complete');
  }
  console.log((errors?'✗':'✓')+' '+name+': '+N+' exercises, '+(stats.steps/N).toFixed(1)+' steps each; steps with alternative routes: '+stats.withAlt+', alternatives used: '+stats.altUsed+'; cases '+JSON.stringify(stats.kinds));
}
console.log(errors?'\n'+errors+' errors':'\nAll good');
process.exit(errors?1:0);
