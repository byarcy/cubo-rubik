/* tests/lessons.test.js · Checks, without a browser, every lesson registered in COACH.LESSONS.
   Usage (from the project folder):   node tests/lessons.test.js
   When you add a new lesson this file doesn't need to change: it goes through every lesson that exists.

   For each lesson, 300 exercises solved from start to finish, choosing at random between the main plan and the
   equivalent routes (alt) of each step. It requires that:
     · the generated exercise is at the stage before the lesson and the lesson has something to do;
     · each step (main or alternative) leaves every already-placed piece of the lesson in its place;
     · the lesson ends (it never loops, and never says "broken");
     · when it ends, the lesson's stage is complete. */
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..');
const src=['cube_logic.js','algorithms.js','coach.js'].map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
const {CUBE,COACH}=new Function(src+';return {CUBE,COACH};')();
const rand=n=>Math.floor(Math.random()*n);
const N=300,MAX_STEPS=80;
let errors=0;
const fail=(lesson,msg)=>{errors++;if(errors<=15)console.log('  ✗ ['+lesson+'] '+msg);};

for(const name of Object.keys(COACH.LESSONS)){
  const L=COACH.LESSONS[name];
  const stats={steps:0,withAlt:0,altUsed:0,kinds:{}};
  for(let i=0;i<N;i++){
    if(!L.generate()){fail(name,'could not generate an exercise');continue;}
    if(CUBE.stage()!==L.stage)fail(name,'the exercise starts at stage '+CUBE.stage()+' and it should be '+L.stage);
    if(!L.step().plan)fail(name,'the generated exercise is already solved');
    let current=null,n=0;
    for(;;){
      const e=L.step(current);
      if(e.broken){fail(name,'says "broken" in an exercise that followed the steps');break;}
      if(e.done)break;
      if(!e.plan||!e.plan.length){fail(name,'step without turns: '+JSON.stringify(e));break;}
      if(++n>MAX_STEPS){fail(name,'does not end in '+MAX_STEPS+' steps');break;}
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
