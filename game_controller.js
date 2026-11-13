/* game_controller.js · The bridge: input (pointer, buttons, keyboard), the Challenge clock and counters,
   Practice mode, saving, easter egg and main loop.
   Uses CUBE (cube_logic.js), COACH (coach.js) and GraphicsEngine (graphics_engine.js). */

// Debug mode: scrambling only messes up 1 turn (to quickly test the ending and the easter egg).
// Turn it on here or by opening the page with ?debug=true
const DEBUG_FLAG=false;

(function(){
const $=id=>document.getElementById(id);
// Shows any error on screen, so it can be reported. It is set up before anything else, so it also works
// when the translations can't be loaded (then it uses the module's fallback text, in English).
function showErr(msg){
  let b=document.getElementById('errbar');
  if(!b){b=document.createElement('div');b.id='errbar';b.setAttribute('role','alert');document.body.appendChild(b);}
  b.textContent=msg;
}
window.addEventListener('error',e=>{
  const msg=e.message||'?';
  showErr(I18N.isReady()?I18N.t('err.generic',{msg}):I18N.FALLBACK.generic.replace('{msg}',msg));
});
// Texts: everything the user sees comes from locales/*.json by key. tr = plain text; trh = markup for innerHTML
// (only <b> and <small> survive); esc = escapes a translated piece before putting it inside trh's parameters.
const tr=I18N.t,trh=I18N.html,esc=I18N.escape;
// Nothing is drawn until the texts are loaded
I18N.init().then(start,()=>showErr(I18N.FALLBACK.load));
function start(){
{const t=document.createElement('canvas');if(!(t.getContext('webgl')||t.getContext('experimental-webgl'))){
  showErr(tr('err.webgl'));
  return;
}}
const DEBUG=DEBUG_FLAG||new URLSearchParams(location.search).get('debug')==='true';
const SCR=n=>DEBUG?1:n;
const KEY='cuboRubik.byarcy.v1'+(DEBUG?'.debug':'');
if(DEBUG){const l=document.querySelector('.logo');if(l){const s=document.createElement('span');s.className='debugtag';s.textContent='DEBUG';l.append(' ',s);}}

const {MOVES,FACE_OF,FACE_DIR,OPP,key,nz,isSolved,snapshot}=CUBE;
const LOOK=GraphicsEngine.LOOK,COLHEX=LOOK.faces;
const stage=$('stage');
const G=GraphicsEngine.createScene(stage);
const {canvas,scene,camera,container,camDir,rightW,upT,cubies,stickerMats,STICKER_GLOW,orientFrom,markDirty,normAng,animView,viewStart,viewDrag,viewTwist,turnView,stopSway,resize}=G;
const V=a=>new M3.Vector3(a[0],a[1],a[2]);

// ================= The cube in the scene =================
// 2×2: pieces are 1.5 times bigger, so the cube is the same size as the 3×3
let SC=1,OFF=1;
const piTex=(()=>{
  const c=document.createElement('canvas');c.width=c.height=128;
  const x=c.getContext('2d');x.fillStyle='rgba(10,6,20,1)';
  x.font='bold 92px Georgia, serif';x.textAlign='center';x.textBaseline='middle';x.fillText('π',64,70);
  return new M3.CanvasTexture(c);
})();
const piMats=G.decalMats;
function buildCube(){
  const size=CUBE.size,pieces=[];
  SC=size===2?1.5:1;OFF=size===2?0.75:1;
  CUBE.forEachPiece(p=>pieces.push({p,id:key(p)}));
  G.buildCube({pieces,scale:SC,offset:OFF,
    colorOf:d=>COLHEX[FACE_OF[key(d)]],
    // Easter egg: faint π only on the white center
    decalOf:p=>(size===3?nz(p)===1&&p[1]===1:key(p)==='1,1,1')?piTex:null});
  focusId=undefined;focusMats=[];
}
const syncGroup=g=>G.syncGroup(g,CUBE.byId[g.userData.id]);
function syncFromLogic(){cubies.forEach(syncGroup);markDirty();}
function applySnap(s){CUBE.applySnap(s);syncFromLogic();}

// ================= Animation and queue =================
let queue=[],busy=false,scrambling=false;
function rotateLayer(f,dir,dur,done){
  const [a,l,s]=MOVES[f];const sg=s*dir;
  CUBE.quarter(f,dir);
  G.animateLayer(a,l,sg*Math.PI/2,dur,syncGroup,done);
}
function enqueue(f,n,dur){if(exploded)return;(n===2?[1,1]:[n]).forEach(d=>queue.push({f,d,dur}));pump();}
function pump(){
  if(busy)return;
  if(!queue.length){
    if(scrambling){scrambling=false;afterScramble();}
    afterMoves();return;
  }
  busy=true;
  const q=queue.shift();
  rotateLayer(q.f,q.d,q.dur,()=>{busy=false;pump();});
}

// ================= Game state =================
// mode: 'challenge' or 'practice'; each one keeps its own cube in modeStates
let mode='challenge',hist=[];
let modeStates={challenge:null,practice:null};
const challenge={state:'idle',base:0,start:0,moves:0,best:null};
let helpOpen=false,drawerOpen=false;
// The "Drag a face…" hint goes away once you have turned a face and the whole cube
let tipDone=false,tipFace=false,tipView=false,glossTimer=0;

function challengeTime(){return challenge.state==='running'?challenge.base+performance.now()-challenge.start:challenge.base;}
function fmt(ms){
  ms=Math.max(0,ms);
  const m=Math.floor(ms/60000),s=Math.floor(ms/1000)%60,cs=Math.floor(ms/10)%100;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(cs).padStart(2,'0');
}
// Which face of the cube each letter is, according to how it looks now (U is always the face you see on top)
function viewMap(){
  const wn={};
  for(const f in FACE_DIR)wn[f]=V(FACE_DIR[f]).applyQuaternion(container.quaternion);
  const pick=(ref,ex)=>{let b=null,bv=-2;for(const f in wn){if(ex.includes(f))continue;const v=wn[f].dot(ref);if(v>bv){bv=v;b=f;}}return b;};
  const F=pick(camDir,[]);
  const U=pick(upT,[F,OPP[F]]);
  const R=pick(rightW,[F,OPP[F],U,OPP[U]]);
  return {F,B:OPP[F],U,D:OPP[U],R,L:OPP[R]};
}
function canInput(){return !helpOpen&&!scrambling&&!exploded&&!resetAnim&&!(mode==='challenge'&&challenge.state==='paused');}

function userTurn(f,n){
  lastTouch=performance.now();
  if(!canInput())return;
  if(mode==='challenge'){
    if(challenge.state==='ready'){challenge.state='running';challenge.start=performance.now();challenge.base=0;challenge.moves=0;}
    if(challenge.state==='running')challenge.moves++;
  }
  hist.push({f,n});
  if(mode==='practice')practiceMove({f,n});
  if(!tipDone){tipFace=true;tipDone=tipView;}
  enqueue(f,n,200);
  updateUI();
}
function userTurnView(letter,n){if(G.viewAnim)return;userTurn(viewMap()[letter],n);}
function undo(){
  if(!canInput())return;
  const m=hist.pop();if(!m)return;
  if(mode==='practice')practiceMove({f:m.f,n:m.n===2?2:-m.n});
  enqueue(m.f,m.n===2?2:-m.n,200);
  updateUI();
}
function scramble(n){
  if(scrambling||busy||exploded)return;
  scrambling=true;hist=[];earned=false;armed=true;
  for(const m of CUBE.genScramble(n))(m.n===2?[1,1]:[m.n]).forEach(q=>queue.push({f:m.f,d:q,dur:55}));
  if(mode==='challenge'){challenge.state='scrambling';challenge.base=0;challenge.moves=0;}
  updateUI();pump();
}
function afterScramble(){
  if(mode==='challenge'){challenge.state='ready';challenge.base=0;challenge.moves=0;}
}
function afterMoves(){
  // Easter egg: only when the cube was solved with your own turns
  // Only counts if the cube had been scrambled: that way the message and the easter egg appear once per solve
  const nowSolved=isSolved();let justSolved=false;
  if(armed&&nowSolved&&hist.length>0){armed=false;earned=true;justSolved=true;}
  if(!nowSolved)earned=false;
  let rec=false;
  if(mode==='challenge'&&challenge.state==='running'&&nowSolved){
    challenge.base=challengeTime();challenge.state='done';
    if(challenge.best==null||challenge.base<challenge.best){challenge.best=challenge.base;rec=true;}
  }
  if(justSolved)celebrate(mode==='challenge'&&challenge.state==='done'?fmt(challenge.base)+(rec?' · '+tr('celebrate.record'):''):'');
  if(mode==='practice')practiceAfter();
  updateUI();save();
}

// Message when the cube is completed: neon text and a ring of light
function celebrate(sub){
  const m=$('solvedMsg'),r=$('solvedRing');
  m.innerHTML=trh('celebrate.well')+(sub?'<small></small>':'');if(sub)m.querySelector('small').textContent=sub;
  [m,r].forEach(el=>{el.classList.remove('go');void el.offsetWidth;el.classList.add('go');});
  ensureAudio();
}

// ================= Practice mode =================
function startPractice(){setMode('practice');}
// Switches between Challenge and Practice; each mode keeps its own cube
function setMode(m){
  if(m===mode||helpOpen||busy||queue.length||scrambling||resetAnim)return;
  if(exploded){whenAssembled(()=>setMode(m));return;}
  if(m==='practice'&&CUBE.size!==3){setSize(3);if(CUBE.size!==3)return;}
  modeStates[mode]=snapshot();
  if(challenge.state==='running'){challenge.base=challengeTime();challenge.state='paused';}
  mode=m;openDrawer(false);cancelPress();hist=[];earned=false;armed=false;
  if(m==='practice'){
    applySnap(modeStates.practice);
    practice.target=null;practice.finished=false;
    // no saved exercise (or already finished): a new one is prepared
    if(!modeStates.practice||!lessonDef().step().plan){lessonDef().generate();syncFromLogic();}
    practicePlan();practiceView();
  }else{
    applySnap(modeStates.challenge);armed=!isSolved();
    animView(0,0,new M3.Quaternion(),450);
  }
  updateUI();save();
}

// ---- Lessons (white cross, white corners) ----
// lesson: which one is open · completed: finished exercises of each one
// level: 1 guided (piece, slot, arrow and turns) · 2 piece and slot only · 3 no help
// target: piece to move · plan: turns of this step · i: how many you have done · wrong: extra turns that must be undone
const practice={lesson:'cross',level:1,completed:Object.fromEntries(Object.keys(COACH.LESSONS).map(l=>[l,0])),target:null,kind:null,face:null,plan:[],alt:[],i:0,wrong:[],finished:false};
const lessonDef=()=>COACH.LESSONS[practice.lesson];
// true if you moved the view yourself (fingers or cube button) during the current step: then the app leaves it alone
// until the step ends
let userMovedView=false;
// The texts of each lesson are in the languages: lesson.<lesson>.title / .done / .complete / .free
function setLesson(l){
  if(l===practice.lesson||!COACH.LESSONS[l]||busy||queue.length||scrambling||resetAnim||exploded)return;
  practice.lesson=l;newExercise();
}
const isInverse=(a,b)=>a.f===b.f&&(b.n===2?a.n===2:a.n===-b.n);
// Is turn m the plan's turn s (a half turn can also be made as two quarter turns)?
const matches=(s,m)=>!!s&&m.f===s.f&&(m.n===s.n||s.n===2);
// Keeps track of the guided step with each turn of yours (and each undo)
function practiceMove(m){
  if(practice.level!==1||practice.finished)return;
  const D=practice.wrong;
  if(D.length){if(isInverse(m,D[D.length-1]))D.pop();else D.push(m);return;}
  // on the first turn any of the equivalent routes is fine; from there that one is followed
  if(practice.i===0&&!matches(practice.plan[0],m)){
    const alternative=practice.alt.find(a=>matches(a[0],m));
    if(alternative){practice.plan=alternative;practice.alt=[];}
  }
  const P=practice.plan,i=practice.i;
  const expected=P[i];
  if(expected&&m.f===expected.f&&m.n===expected.n){practice.i++;return;}
  // a half turn made as two quarter turns, in either direction
  if(expected&&m.f===expected.f&&expected.n===2&&m.n!==2){P.splice(i,1,{f:m.f,n:m.n},{f:m.f,n:m.n});practice.i++;return;}
  if(i>0&&isInverse(m,P[i-1])){practice.i--;return;}
  // before starting the step (or after finishing it) any turn is fine: the coach looks at the cube again
  if(i===0||i>=P.length)return;
  D.push(m);
}
// Asks the coach what is next; returns true if the piece changed
function practicePlan(){
  // a new step starts: if you had moved the view, from now on the app may arrange it again if needed
  userMovedView=false;
  const e=lessonDef().step(practice.target),before=practice.target;
  practice.plan=e.plan||[];practice.alt=e.alt||[];practice.i=0;practice.wrong=[];
  practice.kind=e.broken?'broken':e.done?'done':e.kind;practice.face=e.face||null;practice.focusIds=e.focus||null;
  // slot: a fixed spot to frame (lesson 7); keepView: the guide says to keep the same side facing you
  practice.slot=e.slot||null;practice.keepView=!!e.keepView;
  if(e.id)practice.target=e.id;
  if(e.done){practice.target=null;if(!practice.finished){practice.finished=true;practice.completed[practice.lesson]++;celebrate(tr('lesson.'+practice.lesson+'.done'));}}
  return !!e.id&&e.id!==before;
}
// With the cube at rest: if you are not in the middle of a step, the coach looks at the cube again
function practiceAfter(){
  if(practice.finished)return;
  if(practice.level===1&&(practice.wrong.length||(practice.i>0&&practice.i<practice.plan.length)))return;
  const changed=practicePlan();
  // the cube turns by itself only if the piece changed or the face to turn is hidden (and you did not move the view)
  if(!practice.finished&&practice.level<3&&!practice.keepView&&(changed||(practice.level===1&&!userMovedView&&!practiceFacesVisible())))practiceView();
}
function newExercise(){
  if(helpOpen||busy||queue.length||scrambling||resetAnim||exploded)return;
  if(!lessonDef().generate())return;
  syncFromLogic();hist=[];earned=false;armed=false;
  practice.target=null;practice.finished=false;practicePlan();practiceView();
  updateUI();save();
}
// Lesson view: white on top (as in the guide), with the faces to turn, the piece and its slot facing you
// The last-layer lessons turn the cube over, as the guide does: yellow on top
const YELLOW_UP=new M3.Quaternion().setFromAxisAngle(new M3.Vector3(0,0,1),Math.PI);
function practiceView(){
  userMovedView=false;
  const axis=new M3.Vector3(0,1,0),q=new M3.Quaternion(),goal=new M3.Vector3(1,0,1),dirs=[];
  const base=lessonDef().yellowUp?YELLOW_UP:new M3.Quaternion();
  for(const m of practice.plan)if(m.f!=='U'&&m.f!=='D')dirs.push([FACE_DIR[m.f],1]);
  if(practice.target)dirs.push([CUBE.byId[practice.target][0].p,1],[practice.target.split(',').map(Number),0.6]);
  if(practice.slot)dirs.push([practice.slot.split(',').map(Number),1]);
  let y=G.yaw,bestScore=-1e9;
  for(let k=0;k<4;k++){
    const a=k*Math.PI/2;q.setFromAxisAngle(axis,a).multiply(base);
    let s=-0.01*Math.abs(normAng(a-G.yaw));
    for(const [d,w] of dirs)s+=w*V(d).applyQuaternion(q).dot(goal);
    if(s>bestScore){bestScore=s;y=a;}
  }
  animView(y,0,base,500);
}
// Can all the faces to turn in this step be seen now? (the bottom face counts: its arrow sits on the visible sides)
function practiceFacesVisible(){
  const vm=viewMap(),vis=[vm.U,vm.F,vm.R,vm.D];
  return practice.plan.every(m=>vis.includes(m.f));
}

// ---- Aids drawn on the cube: focused piece, slot frame and turn arrow ----
let focusId,focusMats=[];
// Dims all the stickers except those of the pieces "id" (several separated by "|"; null = everything normal)
function setFocus(id){
  if(id===focusId)return;
  const ids=id?id.split('|'):[];
  focusId=id;focusMats=[];
  for(const g of cubies){
    const on=!id||ids.includes(g.userData.id);
    for(const ch of g.children){
      if(!ch.userData.st)continue;
      const mt=ch.material;
      if(mt.userData.hex==null){const c=mt.color;mt.userData.hex=(Math.round(c.r*255)<<16)|(Math.round(c.g*255)<<8)|Math.round(c.b*255);}
      const k=on?1:0.3;
      for(const c of [mt.color,mt.emissive]){c.setHex(mt.userData.hex);c.r*=k;c.g*=k;c.b*=k;}
      if(g.userData.id===ids[0])focusMats.push(mt);
    }
  }
  markDirty();
}
function drawTexture(fn){
  const c=document.createElement('canvas');c.width=c.height=256;
  fn(c.getContext('2d'));return new M3.CanvasTexture(c);
}
// Circular arrow, clockwise (mirrored = counter-clockwise)
const arrowTex=mirrored=>drawTexture(x=>{
  if(mirrored){x.translate(256,0);x.scale(-1,1);}
  x.lineCap='round';x.lineJoin='round';
  const a0=-Math.PI*0.8,a1=Math.PI*0.55,r=82,ex=128+r*Math.cos(a1),ey=128+r*Math.sin(a1);
  const tx=-Math.sin(a1),ty=Math.cos(a1),nx=Math.cos(a1),ny=Math.sin(a1);
  const drawStroke=(w,col,p)=>{
    x.strokeStyle=x.fillStyle=col;x.lineWidth=w;
    x.beginPath();x.arc(128,128,r,a0,a1);x.stroke();
    x.beginPath();x.moveTo(ex+tx*(44+p),ey+ty*(44+p));x.lineTo(ex+nx*(34+p)-tx*4,ey+ny*(34+p)-ty*4);x.lineTo(ex-nx*(34+p)-tx*4,ey-ny*(34+p)-ty*4);x.closePath();x.fill();
  };
  drawStroke(34,'rgba(13,2,33,.92)',10);drawStroke(16,'#00e5ff',0);
});
const frameTex=drawTexture(x=>{
  const rr=(m,w,col)=>{
    const a=m,b=256-m,r=34;
    x.strokeStyle=col;x.lineWidth=w;x.beginPath();
    x.moveTo(a+r,a);x.arcTo(b,a,b,b,r);x.arcTo(b,b,a,b,r);x.arcTo(a,b,a,a,r);x.arcTo(a,a,b,a,r);x.closePath();x.stroke();
  };
  rr(22,30,'rgba(13,2,33,.9)');rr(22,14,'#ff2e97');
});
const ZV=new M3.Vector3(0,0,1);
function makeMark(tex,size){
  const m=new M3.Mesh(new M3.PlaneGeometry(size,size),new M3.MeshBasicMaterial({map:tex,transparent:true,opacity:1,depthWrite:false}));
  m.material.side=2;m.visible=false;m.material.visible=false;m.renderOrder=5;container.add(m);return m;
}
// Straight arrow for the bottom layer (it can't be seen from above): it is stuck on the bottom row of the visible faces
const straightArrowTex=drawTexture(x=>{
  x.lineCap='round';x.lineJoin='round';
  const drawStroke=(w,col,p)=>{
    x.strokeStyle=x.fillStyle=col;x.lineWidth=w;
    x.beginPath();x.moveTo(34,128);x.lineTo(176,128);x.stroke();
    x.beginPath();x.moveTo(226+p,128);x.lineTo(148-p/2,64-p);x.lineTo(148-p/2,192+p);x.closePath();x.fill();
  };
  drawStroke(34,'rgba(13,2,33,.92)',10);drawStroke(16,'#00e5ff',0);
});
const arrows=[makeMark(arrowTex(false),2.5),makeMark(arrowTex(true),2.5)],frames=[0,1,2].map(()=>makeMark(frameTex,1)),arrowsD=[makeMark(straightArrowTex,1.9),makeMark(straightArrowTex,1.9)];
let arrowDTurn=null;
// The layer at the bottom of the view (D, or U when yellow is on top) can't be seen from above. On each visible
// side face, the arrow points where the pieces of that layer move with the turn g.
function arrowD(g){
  let k=0;
  if(g){
    const [,layer,sign]=MOVES[g.f],s=sign*(g.n===-1?-1:1);
    for(const f of ['F','R','B','L']){
      const n=FACE_DIR[f];
      if(V(n).applyQuaternion(container.quaternion).dot(camDir)<0.25||k>=2)continue;
      const m=arrowsD[k++],t=[n[2]*s,0,-n[0]*s];
      m.quaternion.setFromRotationMatrix(new M3.Matrix4().makeBasis(V(t),new M3.Vector3().crossVectors(V(n),V(t)),V(n)));
      m.position.set(n[0]*1.56,layer,n[2]*1.56);
      m.visible=m.material.visible=true;
    }
  }
  for(;k<2;k++)arrowsD[k].visible=arrowsD[k].material.visible=false;
  markDirty();
}
function placeMark(m,show,pos,dir,scale=1){
  m.visible=m.material.visible=show;
  if(show){m.position.set(pos[0],pos[1],pos[2]);m.quaternion.setFromUnitVectors(ZV,V(dir));m.scale.setScalar(scale);}
}
// The turn due now in the guided step: the plan's next one or, if you went off, the one that undoes it
function practiceNextTurn(){
  const D=practice.wrong;
  if(D.length){const t=D[D.length-1];return {f:t.f,n:t.n===2?2:-t.n};}
  return practice.plan[practice.i]||null;
}
function practiceVisuals(on){
  const group=practice.focusIds&&practice.focusIds.length?practice.focusIds:null;
  const assist=!!on&&!practice.finished&&practice.kind!=='broken'&&(!!practice.target||!!group||practice.plan.length>0);
  const focus=assist&&practice.level<3;
  const h=!focus?null:practice.target?practice.target.split(',').map(Number):practice.slot?practice.slot.split(',').map(Number):null;
  // one piece, plus the center it goes to (cross) or the center it has to match (second layer);
  // in the last layer, a group of pieces (the yellow shape, the edges or corners already in place)
  const extra=!h||!practice.target?null:practice.lesson==='cross'?key([h[0],0,h[2]]):practice.face?key(FACE_DIR[practice.face]):null;
  setFocus(!focus?null:practice.target?practice.target+(extra?'|'+extra:''):group?group.join('|'):null);
  frames.forEach((m,a)=>{
    const d=[0,0,0];if(h)d[a]=h[a];
    const show=!!h&&h[a]!==0;
    placeMark(m,show,show&&h.map((v,i)=>v+d[i]*0.54),d);
  });
  const g=assist&&practice.level===1?practiceNextTurn():null;
  // the horizontal layer at the bottom of the view gets straight arrows; any other face, the round one on it
  const bottom=g&&(g.f==='U'||g.f==='D')&&viewMap().D===g.f;
  arrowDTurn=bottom?g:null;
  arrowD(arrowDTurn);
  arrows.forEach((m,i)=>{
    const show=!!g&&!bottom&&(g.n===-1)===(i===1),d=g?FACE_DIR[g.f]:null;
    placeMark(m,show,d&&d.map(v=>v*1.56),d);
  });
  markDirty();
}

// ---- Lesson panel ----
// Colors, directions and layers are named by key (color.U, dir.D, layer.F…); the last two as the cube looks now
const turnText=(m,L)=>L[m.f]+(m.n===-1?"'":m.n===2?'2':'');
function practiceRender(){
  // Stage bar
  const E=CUBE.STAGES,box=$('stages'),real=CUBE.stage();
  const n=!practice.finished&&practice.kind!=='broken'?Math.max(real,lessonDef().stage):real;
  if(!box.children.length)E.forEach(()=>box.appendChild(document.createElement('i')));
  [...box.children].forEach((el,i)=>{el.className=i<n?'on':i===n?'cur':'';});
  box.setAttribute('aria-label',tr('stage.aria',{n,total:E.length}));
  $('stageText').innerHTML=n<E.length?trh('stage.label',{n:n+1,total:E.length,name:esc(tr('stage.'+E[n].id))}):trh('stage.solved');
  document.querySelectorAll('#levels button').forEach(b=>b.classList.toggle('on',+b.dataset.level===practice.level));
  document.querySelectorAll('#lessons button').forEach(b=>b.classList.toggle('on',b.dataset.lesson===practice.lesson));
  const completed=practice.completed[practice.lesson];
  $('practiceTitle').textContent=tr('lesson.'+practice.lesson+'.title');
  $('practiceCount').textContent=completed?tr('practice.done',{n:completed}):'';
  // Letters as the cube looks now: model face → letter
  const vm=viewMap(),L={};for(const l in vm)L[vm[l]]=l;
  let msg='',chips=[];
  const sts=practice.target&&CUBE.byId[practice.target];
  // every translated piece is escaped before it goes inside a message (the messages are markup)
  const first=c=>c==='U'||c===practice.face;
  const colors=sts?'<b>'+sts.map(s=>s.c).sort((a,b)=>first(b)-first(a)).map(c=>esc(tr('color.'+c))).join('-')+'</b>':'';
  const center=sts&&sts.find(s=>s.c!=='U'),faceCode=practice.face||(center&&center.c);
  const face=faceCode?'<b>'+esc(tr('color.'+faceCode))+'</b>':'';
  const piece=trh(practice.lesson==='corners'?'piece.corner':'piece.edge',{colors});
  const layer=esc(tr('layer.'+L.D)),dir=esc(tr('dir.'+L.D));
  if(practice.finished)msg=trh('lesson.'+practice.lesson+'.complete');
  else if(practice.kind==='broken')msg=trh({corners:'msg.broken',secondLayer:'msg.brokenLayer'}[practice.lesson]||'msg.brokenSolved');
  else if(practice.level===3)msg=trh('lesson.'+practice.lesson+'.free');
  else if(practice.wrong.length)msg=trh('msg.wrong');
  else if(practice.kind==='yTurnTwist')msg=trh('msg.yturn.twist');
  else if(practice.kind==='yTurnKeep')msg=trh('msg.yturn.keep');
  else if(practice.kind==='yTurnHalf')msg=trh('msg.yturn.half');
  else if(practice.kind==='yTurnNext')msg=trh('msg.yturn.next',{layer});
  else if(practice.kind==='yTurnFinish')msg=trh('msg.yturn.finish',{layer});
  else if(practice.kind==='yCrossDot')msg=trh('msg.ycross.dot');
  else if(practice.kind==='yCrossL')msg=trh('msg.ycross.L');
  else if(practice.kind==='yCrossLine')msg=trh('msg.ycross.line');
  else if(practice.lesson==='yellowEdges'&&practice.kind==='align')msg=trh('msg.yedges.align',{layer});
  else if(practice.kind==='yEdgesSwap')msg=trh('msg.yedges.swap');
  else if(practice.kind==='yEdgesOpposite')msg=trh('msg.yedges.opposite');
  else if(practice.kind==='yCornersNone')msg=trh('msg.ycorners.none');
  else if(practice.kind==='yCornersCycle')msg=trh('msg.ycorners.cycle');
  else if(practice.kind==='secondTake')msg=trh('msg.second.take',{piece,layer});
  else if(practice.lesson==='secondLayer'&&practice.kind==='align')msg=trh('msg.second.align',{piece,layer,face});
  else if(practice.kind==='secondRight')msg=trh('msg.second.right',{piece,face});
  else if(practice.kind==='secondLeft')msg=trh('msg.second.left',{piece,face});
  else if(practice.kind==='crossTake')msg=trh('msg.cross.take',{piece,layer});
  else if(practice.kind==='crossMiddle')msg=trh('msg.cross.middle',{piece,layer});
  else if(practice.lesson==='cross'&&practice.kind==='align')msg=trh('msg.cross.align',{piece,layer,face});
  else if(practice.kind==='crossUp')msg=trh('msg.cross.up',{piece,face,dir});
  else if(practice.kind==='crossFlipped')msg=trh('msg.cross.flipped',{piece,face});
  else if(practice.kind==='align')msg=trh('msg.corner.align',{piece,layer});
  else if(practice.kind==='take')msg=trh('msg.corner.take',{piece});
  else if(practice.kind==='cornerOut')msg=trh('msg.corner.out',{piece,dir});
  else if(sts)msg=trh('msg.corner.in',{piece,dir:esc(tr('dir.'+L[FACE_OF[key(sts.find(s=>s.c==='U').n)]]))});
  if(practice.level===1&&!practice.finished&&practice.kind!=='broken'){
    if(practice.wrong.length)chips=[['bad',turnText(practiceNextTurn(),L)]];
    else chips=practice.plan.map((m,i)=>[i<practice.i?'done':i===practice.i?'cur':'',turnText(m,L)]);
  }
  $('practiceMsg').innerHTML=msg;
  const seq=$('practiceSeq');seq.textContent='';seq.hidden=practice.level!==1;
  for(const [cls,t] of chips){const s=document.createElement('span');s.className=cls;s.textContent=t;seq.appendChild(s);}
  practiceVisuals(true);
}

// ================= Pointer interaction =================
const ray=new M3.Raycaster(),ndc=new M3.Vector2();
let pd=null;
function setNDC(e){const r=canvas.getBoundingClientRect();ndc.x=((e.clientX-r.left)/r.width)*2-1;ndc.y=-((e.clientY-r.top)/r.height)*2+1;}
function groupOf(o){while(o&&!o.userData.id)o=o.parent;return o;}
// The 24 straight orientations of the cube
const SNAPS=[];
{
  const perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  for(const p of perms)for(const sx of[1,-1])for(const sy of[1,-1])for(const sz of[1,-1]){
    const s=[sx,sy,sz];
    const c=p.map((ax,i)=>{const v=new M3.Vector3();v.setComponent(ax,s[i]);return v;});
    if(new M3.Vector3().crossVectors(c[0],c[1]).dot(c[2])<0.5)continue;
    SNAPS.push(new M3.Quaternion().setFromRotationMatrix(new M3.Matrix4().makeBasis(c[0],c[1],c[2])));
  }
}
function endView(V){
  if(!V||!V.moved)return;
  userMovedView=true;
  if(!tipDone){tipView=true;tipDone=tipFace;}
  if(!G.viewEnd(V)){updateUI();save();}
}
const ptrs=new Map();
function twoP(){const a=[...ptrs.values()];return {cx:(a[0].x+a[1].x)/2,cy:(a[0].y+a[1].y)/2,ang:Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x)};}
['pointerdown','pointermove','pointerup'].forEach(t=>canvas.addEventListener(t,markDirty));
document.addEventListener('visibilitychange',markDirty);
canvas.addEventListener('pointerdown',e=>{
  if(helpOpen)return;
  ensureAudio();lastTouch=performance.now();stopSway();
  if(exploded)return;
  // The corner box (back view) turns nothing
  const r=canvas.getBoundingClientRect(),lx=e.clientX-r.left,ly=e.clientY-r.top;
  if(ptrs.size===0&&lx>r.width-G.MINI-12&&ly<G.MINI+12){
    return;
  }
  try{canvas.setPointerCapture(e.pointerId);}catch(_){}
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size>1)cancelPress();
  if(ptrs.size===1){
    setNDC(e);ray.setFromCamera(ndc,camera);
    const hits=ray.intersectObjects(cubies,true).filter(h=>h.face&&h.object.isMesh);
    if(hits.length&&!busy&&canInput()&&!G.viewAnim&&!G.inertia){
      const h=hits[0];const grp=groupOf(h.object);
      const wq=new M3.Quaternion();h.object.getWorldQuaternion(wq);
      const nLoc=(h.object.userData.st||h.object.userData.decal)?new M3.Vector3(0,0,1):h.face.normal.clone();
      const nW=nLoc.applyQuaternion(wq).normalize();
      pd={type:'face',id:e.pointerId,start:h.point.clone(),nW,grp,done:false};
      if(showcase)press={id:e.pointerId,x:e.clientX,y:e.clientY,t0:performance.now(),snd:null};
    }else{
      pd={type:'view',id:e.pointerId,x:e.clientX,y:e.clientY,V:viewStart()};
    }
  }else if(ptrs.size===2){
    // Two fingers: the whole cube always moves, as in the hand
    const t=twoP();
    pd={type:'multi',cx:t.cx,cy:t.cy,ang:t.ang,V:viewStart()};
  }
});
canvas.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId))return;
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(press&&press.id===e.pointerId){
    if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>10)cancelPress();
    else return;
  }
  if(!pd)return;
  if(pd.type==='multi'){
    if(ptrs.size<2)return;
    const t=twoP();
    let da=t.ang-pd.ang;
    while(da>Math.PI)da-=2*Math.PI;
    while(da<-Math.PI)da+=2*Math.PI;
    viewDrag(pd.V,t.cx-pd.cx,t.cy-pd.cy);
    viewTwist(pd.V,da);
    pd.cx=t.cx;pd.cy=t.cy;pd.ang=t.ang;
    return;
  }
  if(pd.type==='multiEnd'||e.pointerId!==pd.id)return;
  if(pd.type==='view'){
    viewDrag(pd.V,e.clientX-pd.x,e.clientY-pd.y);
    pd.x=e.clientX;pd.y=e.clientY;
    return;
  }
  if(pd.done)return;
  setNDC(e);ray.setFromCamera(ndc,camera);
  const plane=new M3.Plane().setFromNormalAndCoplanarPoint(pd.nW,pd.start);
  const p=new M3.Vector3();
  if(!ray.ray.intersectPlane(plane,p))return;
  const dW=p.sub(pd.start);
  if(dW.length()<0.3)return;
  pd.done=true;
  const inv=container.quaternion.clone().invert();
  const dL=dW.normalize().applyQuaternion(inv);
  const nL=pd.nW.clone().applyQuaternion(inv).round();
  const ax=new M3.Vector3().crossVectors(nL,dL);
  let best=-1,bv=-1;
  for(let a=0;a<3;a++){
    if(Math.abs(nL.getComponent(a))>0.5)continue;
    const l=Math.round(pd.grp.position.getComponent(a));
    if(l===0)continue;
    const v=Math.abs(ax.getComponent(a));
    if(v>bv){bv=v;best=a;}
  }
  if(best<0)return;
  const l=Math.round(pd.grp.position.getComponent(best));
  const sgn=Math.sign(ax.getComponent(best));
  const f=Object.keys(MOVES).find(k=>MOVES[k][0]===best&&MOVES[k][1]===l);
  if(!f||!sgn)return;
  userTurn(f,sgn*MOVES[f][2]);
});
function endPointer(e){
  ptrs.delete(e.pointerId);
  if(press&&press.id===e.pointerId)cancelPress();
  if(!pd)return;
  if(ptrs.size===0){
    if(pd.V)endView(pd.V);
    pd=null;
  }else if(pd.type==='multi'){
    // One finger is left: it is ignored until everything is released, so there are no jumps
    pd.type='multiEnd';
  }
}
canvas.addEventListener('pointerup',endPointer);
canvas.addEventListener('pointercancel',endPointer);
// Cube button: 1 tap = straighten without flipping; 2 taps or hold = starting position (white on top)
{
  const b=$('restore');let t=0,long=false,lastTap=0;
  const home=()=>{userMovedView=true;showTipFor(b,tr('view.home'));animView(0,0,new M3.Quaternion(),450);};
  b.addEventListener('pointerdown',()=>{
    long=false;clearTimeout(t);
    t=setTimeout(()=>{long=true;lastTap=0;home();},550);
  });
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>clearTimeout(t)));
  b.addEventListener('click',()=>{
    if(long){long=false;return;}
    const now=performance.now();
    if(now-lastTap<400){lastTap=0;home();return;}
    lastTap=now;userMovedView=true;
    // Straighten: turn to the nearest quarter turn and no tilt (or upside down)
    const yaw=G.yaw,pitch=G.pitch;
    const y1=Math.round(yaw/(Math.PI/2))*(Math.PI/2),p1=Math.abs(pitch)>Math.PI/2?Math.PI*Math.sign(pitch):0;
    if(Math.abs(normAng(y1-yaw))<0.01&&Math.abs(normAng(p1-pitch))<0.01&&Math.abs(normAng(G.roll))<0.01)showTipFor(b,tr('view.straight'));
    animView(y1,p1,G.base,380);
  });
}

// ================= Saving =================
let savedOk=true;
function setSaved(ok){savedOk=ok;const e=$('saved');e.setAttribute('aria-label',tr(ok?'saved.yes':'saved.no'));e.style.opacity=ok?'1':'0.3';}
// Each size (3×3 and 2×2) keeps its own cube, step, time and record
const other={2:null,3:null};
function challengeSave(){return {state:challenge.state==='running'?'paused':(challenge.state==='scrambling'?'idle':challenge.state),base:challengeTime(),moves:challenge.moves,best:challenge.best};}
function challengeLoad(r){challenge.state=r&&r.state||'idle';challenge.base=r&&r.base||0;challenge.moves=r&&r.moves||0;challenge.best=r&&r.best!=null?r.best:null;}
function save(){
  try{
    modeStates[mode]=snapshot();
    const d={v:1,sz:CUBE.size,alt:other[CUBE.size===3?2:3],mode,hist:hist.slice(-300),view:G.getView(),tipDone,states:modeStates,challenge:challengeSave(),practice:{lesson:practice.lesson,level:practice.level,completed:practice.completed}};
    localStorage.setItem(KEY,JSON.stringify(d));setSaved(true);
  }catch(e){setSaved(false);}
}
// Saves from v0.33 and earlier used Spanish names (reto, practica, prac, leccion…). They are upgraded here, so that
// nobody loses progress; new saves are written with the English names. (The storage KEY keeps its old name on purpose.)
const OLD_LESSON={cruz:'cross',esquinas:'corners'},OLD_MODE={reto:'challenge',practica:'practice'};
function upgradeStates(s){
  return s?{challenge:s.challenge||s.reto||null,practice:s.practice||s.practica||null}:s;
}
function upgradeSave(d){
  if(!d||typeof d!=='object')return d;
  d.mode=OLD_MODE[d.mode]||d.mode;
  d.states=upgradeStates(d.states);
  if(!d.challenge&&d.reto)d.challenge=d.reto;
  if(!d.practice&&d.prac){
    const old=d.prac,hh=old.hechos;
    d.practice={lesson:OLD_LESSON[old.leccion]||old.leccion,level:old.nivel,
      completed:hh&&typeof hh==='object'?{cross:hh.cruz,corners:hh.esquinas}:hh};
  }
  if(d.alt&&typeof d.alt==='object'){
    d.alt.states=upgradeStates(d.alt.states);
    if(!d.alt.challenge&&d.alt.reto)d.alt.challenge=d.alt.reto;
  }
  return d;
}
function load(){
  try{
    const d=upgradeSave(JSON.parse(localStorage.getItem(KEY)||'null'));
    if(!d||d.v!==1)return false;
    CUBE.size=d.sz;other[CUBE.size===3?2:3]=d.alt||null;
    if(CUBE.size===2)buildCube();
    tipDone=d.tipDone===true;
    modeStates={challenge:d.states&&d.states.challenge||null,practice:d.states&&d.states.practice||null};
    if(d.practice){
      const num=v=>Math.max(0,Math.floor(+v)||0),hh=d.practice.completed;
      practice.level=[1,2,3].includes(d.practice.level)?d.practice.level:1;
      // before, only the corners lesson existed and "completed" was a number
      practice.lesson=COACH.LESSONS[d.practice.lesson]?d.practice.lesson:'corners';
      practice.completed=Object.fromEntries(Object.keys(COACH.LESSONS).map(l=>[l,num(hh&&typeof hh==='object'?hh[l]:l==='corners'?hh:0)]));
    }
    const okQ=a=>Array.isArray(a)&&a.length===4&&a.every(v=>typeof v==='number'&&isFinite(v));
    if(d.view&&okQ(d.view.base))G.setView(+d.view.yaw||0,+d.view.pitch||0,d.view.base,+d.view.roll||0);
    if(d.challenge)challengeLoad(d.challenge);
    applySnap(modeStates[mode]);
    // the history is only valid if it was saved in this same mode
    if(Array.isArray(d.hist)&&d.mode===mode)hist=d.hist.filter(CUBE.isMove).map(m=>({f:m.f,n:m.n}));
    return true;
  }catch(e){return false;}
}
function setSize(n){
  const size=CUBE.size;
  if(n===size||busy||queue.length||scrambling||resetAnim)return;
  if(exploded){whenAssembled(()=>setSize(n));return;}
  modeStates[mode]=snapshot();
  if(challenge.state==='running'){challenge.base=challengeTime();challenge.state='paused';}
  other[size]={states:modeStates,challenge:challengeSave()};
  const o=other[n]||{};other[n]=null;
  CUBE.size=n;cancelPress();buildCube();
  modeStates=o.states||{challenge:null,practice:null};challengeLoad(o.challenge);
  applySnap(modeStates[mode]);hist=[];earned=false;armed=!isSolved();
  showTipFor($('sizeBtn'),tr('size.cube',{size:n+'×'+n}));
  updateUI();save();
}

// ================= Interface =================
function updateUI(){
  markDirty();
  const size=CUBE.size;
  const app=$('app'),wasChallenge=app.classList.contains('m-challenge');
  app.classList.toggle('m-challenge',mode==='challenge');
  if(wasChallenge!==(mode==='challenge'))requestAnimationFrame(resize);
  $('tabChallenge').classList.toggle('on',mode==='challenge');
  $('tabPractice').classList.toggle('on',mode==='practice');
  $('sizeBtn').textContent=size+'×'+size;$('sizeBtn').setAttribute('aria-label',tr('size.aria',{size:size+'×'+size,other:size===3?'2×2':'3×3'}));
  $('challengeBar').hidden=mode!=='challenge';
  $('challengePanel').hidden=mode!=='challenge';
  $('practiceBar').hidden=$('practicePanel').hidden=mode!=='practice';
  {const b=$('bScramble'),txt=tr(mode==='practice'?'btn.newExercise':'btn.scramble');b.dataset.tip=txt;b.setAttribute('aria-label',txt);}
  if(mode==='practice')practiceRender();else practiceVisuals(false);
  $('pauseOv').hidden=!(mode==='challenge'&&challenge.state==='paused');
  // Challenge
  $('movesVal').textContent=challenge.moves;
  $('bestVal').textContent=challenge.best==null?'--:--.--':fmt(challenge.best);
  $('challengeMsg').textContent=challenge.state==='done'?tr('challenge.done',{time:fmt(challenge.base),n:challenge.moves}):challenge.state in {idle:1,scrambling:1,ready:1,running:1,paused:1}?tr('challenge.'+challenge.state):'';
  $('pauseIco').innerHTML=challenge.state==='paused'?'<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#00e5ff" stroke="#00e5ff" stroke-width="2" stroke-linejoin="round"><path d="M8 5l11 7-11 7z"></path></svg>':'<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" stroke-width="2.6" stroke-linecap="round"><path d="M9 5v14M15 5v14"></path></svg>';
  {const txt=tr(challenge.state==='paused'?'challenge.resume':'challenge.pause');$('pauseBtn').setAttribute('aria-label',txt);$('pauseBtn').dataset.tip=txt;}
  $('pauseBtn').disabled=!(challenge.state==='running'||challenge.state==='paused');
}

// Buttons
$('tabPractice').onclick=startPractice;
$('tabChallenge').onclick=()=>setMode('challenge');
$('practiceNew').onclick=newExercise;
document.querySelectorAll('#lessons button').forEach(b=>b.onclick=()=>setLesson(b.dataset.lesson));
document.querySelectorAll('#levels button').forEach(b=>b.onclick=()=>{
  practice.level=+b.dataset.level;
  if(!practice.finished&&!busy&&!queue.length){practicePlan();if(practice.level<3)practiceView();}
  updateUI();save();
});
// Holding an icon shows its name (and doesn't activate it)
function showTipFor(el,txt){
  const box=$('gloss');box.textContent=txt;box.hidden=false;
  const ar=$('app').getBoundingClientRect(),br=el.getBoundingClientRect();
  box.style.top=Math.max(8,br.top-ar.top-box.offsetHeight-8)+'px';
  clearTimeout(glossTimer);glossTimer=setTimeout(()=>{box.hidden=true;},1600);
}
function tap(id,fn){
  const b=$(id);let t=0;
  b.addEventListener('pointerdown',()=>{b._tip=false;clearTimeout(t);t=setTimeout(()=>{b._tip=true;showTipFor(b,b.dataset.tip||b.getAttribute('aria-label'));},550);});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>clearTimeout(t)));
  b.addEventListener('click',e=>{if(b._tip){b._tip=false;return;}if(!b.disabled)fn(e);});
}
// Scramble asks for a second tap if the cube already has progress
let scrArm=0,scrTimer=0;
function shuffleTap(){
  if(helpOpen||busy||queue.length||scrambling)return;
  if(mode==='practice'){newExercise();return;}
  if(exploded){rearm();return;}
  const b=$('bScramble');
  if(resetAnim)return;
  if(!isSolved()&&performance.now()>scrArm){
    scrArm=performance.now()+2500;b.classList.add('arm');showTipFor(b,tr('scramble.confirm'));
    clearTimeout(scrTimer);scrTimer=setTimeout(()=>{b.classList.remove('arm');scrArm=0;},2500);
    return;
  }
  scrArm=0;b.classList.remove('arm');clearTimeout(scrTimer);
  // With the cube messed up: it is first reassembled by itself, to see it in order as when opening the app
  if(!isSolved()){resetToSolved();return;}
  scramble(SCR(CUBE.size===2?11:25));
}
tap('bScramble',shuffleTap);
function resetToSolved(){
  if(busy||queue.length||scrambling||resetAnim||exploded)return;
  openDrawer(false);cancelPress();
  const items=cubies.map(g=>{const h=g.userData.id.split(',').map(Number);return {g,p0:g.position.clone(),q0:g.quaternion.clone(),p1:new M3.Vector3(h[0]*OFF,h[1]*OFF,h[2]*OFF),delay:Math.random()*0.22};});
  CUBE.resetLogic();hist=[];earned=false;armed=false;
  if(mode==='challenge'){challenge.state='idle';challenge.base=0;challenge.moves=0;}
  resetAnim={t0:performance.now(),items};
  animView(0,0,new M3.Quaternion(),800);
  updateUI();
}
tap('bUndo',undo);
tap('bTurns',()=>openDrawer(!drawerOpen));
tap('pauseBtn',()=>{
  if(challenge.state==='running'){challenge.base=challengeTime();challenge.state='paused';}
  else if(challenge.state==='paused'){challenge.start=performance.now();challenge.state='running';}
  updateUI();save();
});
tap('sizeBtn',()=>{
  if(mode==='practice'){showTipFor($('sizeBtn'),tr('size.practiceOnly'));return;}
  setSize(CUBE.size===3?2:3);
});

function openDrawer(o){drawerOpen=o;$('drawer').classList.toggle('open',o);$('drawer').setAttribute('aria-hidden',o?'false':'true');}
$('dClose').onclick=()=>openDrawer(false);
const mg=$('turnGrid');
[['',1,''],["'",-1,' p'],['2',2,' d']].forEach(([suf,n,cls])=>{
  'RLUDFB'.split('').forEach(f=>{
    const b=document.createElement('button');
    b.className='mv'+cls;b.textContent=f+suf;
    b.onclick=()=>userTurnView(f,n);
    mg.appendChild(b);
  });
});
// Language selector (in the help): one option per language in locales/languages.json; on change everything is repainted
{
  const sel=$('langSel');
  for(const {code,name} of I18N.list()){const o=document.createElement('option');o.value=code;o.textContent=name;sel.appendChild(o);}
  sel.value=I18N.language();
  sel.onchange=()=>I18N.use(sel.value,true).catch(()=>{sel.value=I18N.language();showTipFor(sel,tr('err.language'));});
  I18N.onChange(code=>{
    sel.value=code;
    document.title=tr('app.title')+' · v'+document.documentElement.dataset.version;
    setSaved(savedOk);updateUI();
  });
  document.title=tr('app.title')+' · v'+document.documentElement.dataset.version;
}
$('helpBtn').onclick=()=>{helpOpen=true;$('help').hidden=false;};
$('hClose').onclick=()=>{helpOpen=false;$('help').hidden=true;};
// Help: tabs
document.querySelectorAll('.htabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.htabs button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('[data-help-panel]').forEach(panel=>panel.hidden=panel.dataset.helpPanel!==b.dataset.helpTab);
  $('help').scrollTop=0;
});
document.addEventListener('keydown',e=>{
  if(helpOpen){if(e.key==='Escape')$('hClose').click();return;}
  if(e.key==='Escape'&&drawerOpen)openDrawer(false);
});
window.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});

// ================= Easter egg =================
let armed=false,earned=false,showcase=false,exploded=false,resetAnim=null,press=null,lastTouch=0,rearmAnim=null,sparks=null,inflow=null;
const PI_MS=Math.PI*1000;
// ---- Sound: bus with compressor and reverb so nothing sounds shrill ----
let actx=null,master=null,verb=null;
function ensureAudio(){
  try{
    if(!actx){const A=window.AudioContext||window.webkitAudioContext;if(A)actx=new A();}
    if(actx&&actx.state==='suspended')actx.resume();
    if(actx&&!master){
      const comp=actx.createDynamicsCompressor();
      comp.threshold.value=-20;comp.knee.value=12;comp.ratio.value=4;comp.attack.value=0.004;comp.release.value=0.25;
      comp.connect(actx.destination);
      master=actx.createGain();master.gain.value=0.6;master.connect(comp);
      const len=Math.floor(actx.sampleRate*2.4),ir=actx.createBuffer(2,len,actx.sampleRate);
      for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);}
      verb=actx.createConvolver();verb.buffer=ir;
      const vg=actx.createGain();vg.gain.value=0.45;verb.connect(vg);vg.connect(master);
    }
  }catch(e){actx=null;}
}
function bus(node,wet){
  node.connect(master);
  if(wet){const s=actx.createGain();s.gain.value=wet;node.connect(s);s.connect(verb);}
}
function noiseBuf(sec){
  const len=Math.floor(actx.sampleRate*sec),b=actx.createBuffer(1,len,actx.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;return b;
}
// Charge: warm chord (A minor) that rises and opens up little by little
function chargeSound(){
  if(!actx||!master)return null;
  try{
    const t=actx.currentTime,T=(PI_MS-500)/1000;
    const lp=actx.createBiquadFilter();lp.type='lowpass';lp.Q.value=4;
    lp.frequency.setValueAtTime(260,t);lp.frequency.exponentialRampToValueAtTime(2800,t+T);
    const g=actx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.13,t+T);
    lp.connect(g);bus(g,0.35);
    const os=[];
    [110,164.81,220].forEach(f=>[-6,6].forEach(c=>{
      const o=actx.createOscillator();o.type='sawtooth';o.detune.value=c;
      o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.5,t+T);
      o.connect(lp);o.start(t);os.push(o);
    }));
    const sub=actx.createOscillator();sub.type='sine';sub.frequency.setValueAtTime(55,t);sub.frequency.exponentialRampToValueAtTime(82.4,t+T);
    const sg=actx.createGain();sg.gain.value=0.5;sub.connect(sg);sg.connect(g);sub.start(t);os.push(sub);
    return {os,g};
  }catch(e){return null;}
}
function stopSound(sn){
  if(!sn||!actx)return;
  try{const t=actx.currentTime;sn.g.gain.cancelScheduledValues(t);sn.g.gain.setValueAtTime(sn.g.gain.value,t);sn.g.gain.exponentialRampToValueAtTime(0.0001,t+0.25);sn.os.forEach(o=>o.stop(t+0.3));}catch(e){}
}
// Explosion: deep thump, echoing burst and a bright chord that fades out
function boomSound(){
  if(!actx||!master)return;
  try{
    const t=actx.currentTime;
    const k=actx.createOscillator();k.type='sine';k.frequency.setValueAtTime(130,t);k.frequency.exponentialRampToValueAtTime(32,t+0.7);
    const kg=actx.createGain();kg.gain.setValueAtTime(0.9,t);kg.gain.exponentialRampToValueAtTime(0.001,t+1.1);
    k.connect(kg);bus(kg,0.15);k.start(t);k.stop(t+1.2);
    const n=actx.createBufferSource();n.buffer=noiseBuf(1.6);
    const nl=actx.createBiquadFilter();nl.type='lowpass';nl.frequency.setValueAtTime(3200,t);nl.frequency.exponentialRampToValueAtTime(140,t+1.4);
    const ng=actx.createGain();ng.gain.setValueAtTime(0.45,t);ng.gain.exponentialRampToValueAtTime(0.001,t+1.5);
    n.connect(nl);nl.connect(ng);bus(ng,0.6);n.start(t);
    const cl=actx.createBiquadFilter();cl.type='lowpass';cl.frequency.setValueAtTime(3000,t);cl.frequency.exponentialRampToValueAtTime(500,t+1.8);
    const cg=actx.createGain();cg.gain.setValueAtTime(0.0001,t);cg.gain.exponentialRampToValueAtTime(0.09,t+0.03);cg.gain.exponentialRampToValueAtTime(0.0001,t+2.2);
    cl.connect(cg);bus(cg,0.7);
    [220,261.63,329.63,493.88].forEach(f=>[-8,8].forEach(c=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=c;o.connect(cl);o.start(t);o.stop(t+2.3);}));
  }catch(e){}
}

// ---- 3D neon rods on the edges of each piece ----
const EDGES=(()=>{
  const h=0.5,sq=y=>[[[-h,y,-h],[h,y,-h]],[[h,y,-h],[h,y,h]],[[h,y,h],[-h,y,h]],[[-h,y,h],[-h,y,-h]]];
  const L=[...sq(-h),[[-h,-h,-h],[-h,h,-h]],[[h,-h,-h],[h,h,-h]],[[h,-h,h],[h,h,h]],[[-h,-h,h],[-h,h,h]],...sq(h)];
  return L.map(([a,b])=>({a:new M3.Vector3(...a),d:new M3.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2])}));
})();
const ROD_N=26*12,rodGeo=new M3.BoxGeometry(1,1,1);
const rodCore=new M3.InstancedMesh(rodGeo,new M3.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:1,blending:M3.AdditiveBlending,depthWrite:false}),ROD_N);
const rodHalo=new M3.InstancedMesh(rodGeo,new M3.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.3,blending:M3.AdditiveBlending,depthWrite:false}),ROD_N);
{const pal=LOOK.neon,c=new M3.Color();for(let i=0;i<ROD_N;i++){c.setHex(pal[Math.floor(i/12)%3]);rodCore.setColorAt(i,c);rodHalo.setColorAt(i,c);}}
[rodCore,rodHalo].forEach(r=>{r.visible=false;r.frustumCulled=false;r.renderOrder=5;scene.add(r);});
const _m=new M3.Matrix4(),_lm=new M3.Matrix4(),_q=new M3.Quaternion(),_s=new M3.Vector3(),_p=new M3.Vector3(),_X=new M3.Vector3(1,0,0),_dir=new M3.Vector3();
function updateRods(prog,now){
  container.updateMatrixWorld(true);
  let i=0;
  cubies.forEach(g=>{
    const dist=g.position.length()/1.733;
    const pc=Math.max(0,Math.min(1,(prog-dist*0.3)/0.7))*12;
    EDGES.forEach((E,ei)=>{
      const f=Math.max(0,Math.min(1,pc-ei));
      if(f<=0){_m.makeScale(0,0,0);rodCore.setMatrixAt(i,_m);rodHalo.setMatrixAt(i,_m);i++;return;}
      _dir.copy(E.d).normalize();_q.setFromUnitVectors(_X,_dir);
      _p.copy(E.a).addScaledVector(E.d,f/2);
      const len=f;
      _s.set(len,0.045,0.045);_lm.compose(_p,_q,_s);_m.multiplyMatrices(g.matrixWorld,_lm);rodCore.setMatrixAt(i,_m);
      _s.set(len+0.05,0.15,0.15);_lm.compose(_p,_q,_s);_m.multiplyMatrices(g.matrixWorld,_lm);rodHalo.setMatrixAt(i,_m);
      i++;
    });
  });
  _m.makeScale(0,0,0);for(;i<ROD_N;i++){rodCore.setMatrixAt(i,_m);rodHalo.setMatrixAt(i,_m);}
  rodCore.instanceMatrix.needsUpdate=true;rodHalo.instanceMatrix.needsUpdate=true;
  rodCore.visible=rodHalo.visible=true;
  rodCore.material.opacity=0.75+0.25*Math.sin(now/45);
  rodHalo.material.opacity=0.18+0.22*prog;
}
function hideRods(){rodCore.visible=rodHalo.visible=false;container.position.set(0,0,0);}
// Sparks that gather toward the cube at the end of the charge
function inflowStart(){
  const n=160,pos=new Float32Array(n*3),col=new Float32Array(n*3),st=[];
  const pal=[...LOOK.neon,LOOK.faces.U],c=new M3.Color();
  for(let i=0;i<n;i++){
    const v=new M3.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize().multiplyScalar(3.2+Math.random()*1.4);
    st.push(v);pos.set([v.x,v.y,v.z],i*3);c.setHex(pal[i%4]);col.set([c.r,c.g,c.b],i*3);
  }
  const geo=new M3.BufferGeometry();geo.setAttribute('position',new M3.BufferAttribute(pos,3));geo.setAttribute('color',new M3.BufferAttribute(col,3));
  const pts=new M3.Points(geo,new M3.PointsMaterial({size:0.12,vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:M3.AdditiveBlending}));
  scene.add(pts);inflow={pts,st};
}
function inflowUpdate(s){
  const p=inflow.pts.geometry.attributes.position,e=s*s;
  for(let i=0;i<inflow.st.length;i++){const v=inflow.st[i],k=1-e*0.85;p.array[i*3]=v.x*k;p.array[i*3+1]=v.y*k;p.array[i*3+2]=v.z*k;}
  p.needsUpdate=true;inflow.pts.material.opacity=Math.min(1,s*1.6);
}
function inflowStop(){if(!inflow)return;scene.remove(inflow.pts);inflow.pts.geometry.dispose();inflow.pts.material.dispose();inflow=null;}
function cancelPress(){
  if(!press)return;
  stopSound(press.snd);press=null;hideRods();inflowStop();
}
// Flash of light on explosion
const flashLight=new M3.PointLight(0xffffff,0,14);scene.add(flashLight);
let flashT=0;
const FLOOR=LOOK.floorY;
// The pieces fall onto the drawn floor (low strip of the stage): their footprint on screen is corrected
const HF=new M3.Vector3(camDir.x,0,camDir.z).normalize(),_pv=new M3.Vector3();
const BAND={top:0.80,bottom:0.91,left:0.07,right:0.93};
function keepOnDrawnFloor(g,v){
  for(let it=0;it<14;it++){
    _pv.set(g.position.x,FLOOR+HALF(),g.position.z).project(camera);
    const sx=(_pv.x+1)/2,sy=(1-_pv.y)/2;let moved=false;
    if(sy<BAND.top){g.position.addScaledVector(HF,0.12);moved=true;const d=v.dot(HF);if(d<0)v.addScaledVector(HF,-1.5*d);}
    else if(sy>BAND.bottom){g.position.addScaledVector(HF,-0.12);moved=true;const d=v.dot(HF);if(d>0)v.addScaledVector(HF,-1.5*d);}
    if(sx<BAND.left){g.position.addScaledVector(rightW,0.12);moved=true;const d=v.dot(rightW);if(d<0)v.addScaledVector(rightW,-1.5*d);}
    else if(sx>BAND.right){g.position.addScaledVector(rightW,-0.12);moved=true;const d=v.dot(rightW);if(d>0)v.addScaledVector(rightW,-1.5*d);}
    if(!moved)break;
  }
}
// Collisions between pieces: they don't pass through each other; if they don't fit on the floor, they pile up. At rest they "sleep" and stop moving.
const PH=()=>0.98*SC,PW=()=>1.04*SC,HALF=()=>0.5*SC;
function collide(){
  const n=cubies.length,PIECE_H=PH(),PIECE_W=PW();
  for(let i=0;i<n;i++){
    const A=cubies[i],a=A.userData;if(!a.v)continue;
    for(let j=i+1;j<n;j++){
      const B=cubies[j],b=B.userData;if(!b.v||(a.sleep&&b.sleep))continue;
      const dx=B.position.x-A.position.x,dy=B.position.y-A.position.y,dz=B.position.z-A.position.z;
      if(Math.abs(dy)>=PIECE_H)continue;
      let h=Math.hypot(dx,dz);if(h>=PIECE_W)continue;
      const pv=PIECE_H-Math.abs(dy),ph=PIECE_W-h;
      if(pv<ph){
        // one on top of another: the top one rests
        let up=dy>0?B:A,dn=up===A?B:A;
        if(up.userData.sleep){up.userData.sleep=false;up.userData.still=0;}
        up.position.y+=pv;const u=up.userData;
        if(u.v.y<0)u.v.y=0;u.v.x*=0.9;u.v.z*=0.9;u.rest=true;
        // if it ended up on the edge of the one below, it slides outward
        if(h>0.3*SC&&(u.slid=(u.slid||0)+1)<120){const sx=(up.position.x-dn.position.x)/h,sz=(up.position.z-dn.position.z)/h;u.v.x+=sx*0.12;u.v.z+=sz*0.12;}
      }else{
        // side by side: they separate horizontally
        let nx,nz;if(h<1e-4){const t=Math.random()*Math.PI*2;nx=Math.cos(t);nz=Math.sin(t);h=0;}else{nx=dx/h;nz=dz/h;}
        const ka=a.sleep?0:b.sleep?1:0.5,kb=1-ka;
        A.position.x-=nx*ph*ka;A.position.z-=nz*ph*ka;B.position.x+=nx*ph*kb;B.position.z+=nz*ph*kb;
        const vn=(b.v.x-a.v.x)*nx+(b.v.z-a.v.z)*nz;
        if(vn<0){const imp=-vn*1.2;a.v.x-=nx*imp*ka;a.v.z-=nz*imp*ka;b.v.x+=nx*imp*kb;b.v.z+=nz*imp*kb;}
      }
    }
  }
}
function explode(){
  const sn=press&&press.snd;press=null;stopSound(sn);hideRods();inflowStop();
  exploded=true;showcase=false;earned=false;pd=null;ptrs.clear();
  openDrawer(false);
  boomSound();flashT=performance.now();boomT=flashT;
  container.updateMatrixWorld(true);
  cubies.forEach(g=>{
    scene.attach(g);
    const dir=g.position.clone();if(dir.lengthSq()<0.01)dir.set(0,1,0);dir.normalize();
    g.userData.v=dir.multiplyScalar(2.2+Math.random()*2.2).add(new M3.Vector3((Math.random()-0.5)*1.6+0.6,4+Math.random()*3,(Math.random()-0.5)*1.6+1.0));
    g.userData.w=new M3.Vector3((Math.random()-0.5)*12,(Math.random()-0.5)*12,(Math.random()-0.5)*12);
    g.userData.sleep=false;g.userData.still=0;g.userData.flat=null;g.userData.slid=0;
  });
  const n=360,pos=new Float32Array(n*3),col=new Float32Array(n*3),vel=[];
  const pal=[...LOOK.neon,...Object.values(LOOK.faces)];
  const c=new M3.Color();
  for(let i=0;i<n;i++){
    c.setHex(pal[i%pal.length]);col.set([c.r,c.g,c.b],i*3);
    vel.push(new M3.Vector3(Math.random()-0.5,Math.random()-0.3,Math.random()-0.5).normalize().multiplyScalar(4+Math.random()*7));
  }
  const geo=new M3.BufferGeometry();
  geo.setAttribute('position',new M3.BufferAttribute(pos,3));
  geo.setAttribute('color',new M3.BufferAttribute(col,3));
  const mat=new M3.PointsMaterial({size:0.14,vertexColors:true,transparent:true,opacity:1,depthWrite:false,blending:M3.AdditiveBlending});
  sparks={pts:new M3.Points(geo,mat),vel,t0:performance.now()};
  scene.add(sparks.pts);
  setTimeout(()=>{if(exploded&&!rearmAnim)$('rearm').hidden=false;},1300);
  updateUI();
}
let boomT=0;const _qs=new M3.Quaternion(),_ws=new M3.Vector3();
function physics(dt,cubes){
  if(cubes){
    for(const g of cubies){
      const u=g.userData;if(!u.v||u.sleep)continue;
      u.v.y-=16*dt;
      g.position.addScaledVector(u.v,dt);
      u.rest=false;
      if(g.position.y<FLOOR+HALF()){
        g.position.y=FLOOR+HALF();
        if(Math.abs(u.v.y)>1.2)u.v.y=-u.v.y*0.35;else u.v.y=0;
        u.v.x*=0.72;u.v.z*=0.72;u.w.multiplyScalar(0.6);
      }
      if(g.position.y<=FLOOR+HALF()+0.001&&u.v.y===0)u.rest=true;
    }
    // at first the pieces come out together: collisions start once they have separated
    if(performance.now()-boomT>350)for(let k=0;k<3;k++)collide();
    for(const g of cubies){
      const u=g.userData;if(!u.v)continue;
      if(!u.sleep&&g.position.y<FLOOR+2.6)keepOnDrawnFloor(g,u.v);
      if(u.rest&&!u.flat){
        // resting: it lies down on one face, like a real piece
        let best=SNAPS[0],bv=-1;for(const sn of SNAPS){const d=Math.abs(g.quaternion.dot(sn));if(d>bv){bv=d;best=sn;}}
        const r=g.quaternion.clone().multiply(best.clone().invert());const tw=new M3.Quaternion(0,r.y,0,r.w);
        u.flat=tw.lengthSq()>1e-6?tw.normalize().multiply(best):best.clone();
      }
      if(u.flat&&(u.rest||u.sleep))g.quaternion.slerp(u.flat,0.12);
      if(u.sleep)continue;
      if(u.rest){u.v.x*=0.9;u.v.z*=0.9;u.w.multiplyScalar(0.85);}
      const ang=u.w.length()*dt;
      if(ang>1e-5)g.quaternion.premultiply(_qs.setFromAxisAngle(_ws.copy(u.w).normalize(),ang));
      // still for a while: it falls asleep
      if(u.rest&&Math.hypot(u.v.x,u.v.z)<0.2){if(++u.still>24){u.sleep=true;u.v.set(0,0,0);u.w.set(0,0,0);}}else u.still=0;
    }
  }
  if(sparks){
    const p=sparks.pts.geometry.attributes.position,life=(performance.now()-sparks.t0)/1700;
    for(let i=0;i<sparks.vel.length;i++){
      const v=sparks.vel[i];v.y-=6*dt;v.multiplyScalar(0.985);
      p.array[i*3]+=v.x*dt;p.array[i*3+1]+=v.y*dt;p.array[i*3+2]+=v.z*dt;
    }
    p.needsUpdate=true;sparks.pts.material.opacity=Math.max(0,1-life);
    if(life>=1){scene.remove(sparks.pts);sparks.pts.geometry.dispose();sparks.pts.material.dispose();sparks=null;}
  }
}
// Does something when the cube is assembled again (if it exploded, it assembles it first)
let afterRearm=null;
function whenAssembled(fn){if(!exploded){fn();return;}afterRearm=fn;rearm();}
function rearm(){
  if(!exploded||rearmAnim)return;
  ensureAudio();
  $('rearm').hidden=true;
  container.updateMatrixWorld(true);
  rearmAnim={t0:performance.now(),items:cubies.map(g=>{
    const sts=CUBE.byId[g.userData.id];
    const tp=new M3.Vector3(sts[0].p[0]*OFF,sts[0].p[1]*OFF,sts[0].p[2]*OFF).applyMatrix4(container.matrixWorld);
    const tq=container.quaternion.clone().multiply(orientFrom(sts));
    return {g,p0:g.position.clone(),q0:g.quaternion.clone(),tp,tq,delay:Math.random()*0.25};
  })};
}
$('rearm').onclick=rearm;
// Showcase: slow random turning so the white (and the π) shows up from time to time
const tumble={vy:0.0003,vp:0,ty:0.0003,tp:0,next:0};
function eggFrame(now,dt){
  showcase=earned&&!exploded&&isSolved()&&!pd&&!busy&&!queue.length&&!G.viewAnim&&!G.inertia&&!helpOpen&&now-lastTouch>900;
  if(showcase&&!press){
    if(now>tumble.next){
      tumble.ty=(0.00016+Math.random()*0.00024)*(Math.random()<0.5?-1:1);
      tumble.tp=(Math.random()-0.5)*0.0005;
      tumble.next=now+3500+Math.random()*3500;
    }
    const a=Math.min(1,dt/1800);
    tumble.vy+=(tumble.ty-tumble.vy)*a;tumble.vp+=(tumble.tp-tumble.vp)*a;
    turnView(tumble.vy*dt,tumble.vp*dt);
  }
  // very faint π that blinks slowly, only with the cube solved by you
  const target=(earned&&isSolved()&&!exploded)?0.15*(0.5-0.5*Math.cos(now*2*Math.PI/6500)):0;
  for(const m of piMats)m.opacity+=(target-m.opacity)*Math.min(1,dt/200);
  if(press){
    const el=now-press.t0;
    if(el>500){
      if(!press.snd)press.snd=chargeSound();
      const prog=Math.min(1,(el-500)/(PI_MS-500));
      updateRods(prog,now);
      // the cube shakes more and more and the pieces light up
      const amp=0.05*prog*prog;
      container.position.set((Math.random()-0.5)*amp,(Math.random()-0.5)*amp,(Math.random()-0.5)*amp);
      for(const m of stickerMats){m.emissiveIntensity=STICKER_GLOW+0.5*prog;}
      if(prog>0.6){if(!inflow)inflowStart();inflowUpdate((prog-0.6)/0.4);}
    }
    if(el>=PI_MS)explode();
  }
  if(flashT){const k=(now-flashT)/600;flashLight.intensity=k<1?4*(1-k)*(1-k):0;if(k>=1)flashT=0;}
  if(exploded||sparks)physics(Math.min(0.033,dt/1000),exploded&&!rearmAnim);
  if(resetAnim){
    const t=(now-resetAnim.t0)/1000;let all=true;const IQ=new M3.Quaternion();
    for(const it of resetAnim.items){
      const k=Math.min(1,Math.max(0,(t-it.delay)/0.8));if(k<1)all=false;
      const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      it.g.position.lerpVectors(it.p0,it.p1,e);
      const lift=Math.sin(Math.PI*k)*0.5;if(lift>0)it.g.position.addScaledVector(it.p1.clone().normalize(),lift);
      it.g.quaternion.copy(it.q0).slerp(IQ,e);
    }
    if(all){resetAnim=null;syncFromLogic();updateUI();save();
      showTipFor($('bScramble'),tr('scramble.start'));}
  }
  if(rearmAnim){
    const t=(now-rearmAnim.t0)/1000;let all=true;
    for(const it of rearmAnim.items){
      const k=Math.min(1,Math.max(0,(t-it.delay)/0.9));if(k<1)all=false;
      const e=1-Math.pow(1-k,3);
      it.g.position.lerpVectors(it.p0,it.tp,e);
      it.g.quaternion.copy(it.q0).slerp(it.tq,e);
    }
    if(all){
      cubies.forEach(g=>{container.attach(g);syncGroup(g);Object.assign(g.userData,{v:null,w:null,flat:null,sleep:false,still:0,rest:false,slid:0});});
      rearmAnim=null;exploded=false;lastTouch=now;
      updateUI();
      const f=afterRearm;afterRearm=null;if(f)f();
    }
  }
}

// ================= Main loop =================
window.addEventListener('resize',resize);
let lastFrame=0;
function loopBody(now){
  if(G.stepView(now)){updateUI();save();}
  for(const m of stickerMats)m.emissiveIntensity=STICKER_GLOW;
  for(const m of focusMats)m.emissiveIntensity=0.42;
  // the straight arrow follows the cube while you turn it
  if(arrowDTurn&&(G.viewAnim||G.inertia||pd))arrowD(arrowDTurn);
  const dt=Math.min(50,now-(lastFrame||now));lastFrame=now;
  eggFrame(now,dt);
  // After a few seconds without touching the cube, it sways a little
  G.idleSway(now,dt,!pd&&!busy&&!queue.length&&!scrambling&&!G.viewAnim&&!G.inertia&&!exploded&&!rearmAnim&&!resetAnim&&!press&&!showcase&&!helpOpen&&now-lastTouch>6000);
  const tip=$('tip');
  const tipTxt=tipDone?'':tr('hint.drag');
  if(tip.textContent!==tipTxt){tip.textContent=tipTxt;tip.hidden=!tipTxt;}
  if(mode==='challenge')setClock(fmt(challengeTime()));
  // Up to 60 frames per second while something moves, 30 in slow animations and none if nothing changes
  const moving=exploded&&!rearmAnim&&cubies.some(g=>g.userData.v&&!g.userData.sleep);
  const fast=busy||queue.length||G.viewAnim||G.inertia||pd||press||moving||sparks||rearmAnim||resetAnim||flashT||inflow;
  const slow=G.swayAmp>0||showcase||piMats.some(m=>m.opacity>0.002);
  if(G.isDirty()||now-lastDraw>=(fast?15:slow?32:Infinity)){lastDraw=now;G.render();}
}
let lastDraw=0;
// Challenge clock: one fixed-width cell per character; only the digit that changed is updated
let clockCells=null;
function setClock(s){
  const el=$('timeVal');
  if(!clockCells||clockCells.length!==s.length){
    el.textContent='';el.setAttribute('aria-label',s);
    clockCells=[...s].map(ch=>{const sp=document.createElement('span');if(ch===':'||ch==='.')sp.className='sep';sp.setAttribute('aria-hidden','true');sp.textContent=ch;el.appendChild(sp);return sp;});
    return;
  }
  for(let i=0;i<s.length;i++)if(clockCells[i].textContent!==s[i])clockCells[i].textContent=s[i];
  if(s[s.length-1]==='0')el.setAttribute('aria-label',s);
}
// The cube keeps being drawn even if some other part fails
let errShown=false;
function loop(now){
  try{loopBody(now);}
  catch(err){if(!errShown){errShown=true;showErr(tr('err.runtime',{msg:err&&err.message||err}));}try{G.render();}catch(e){}}
  requestAnimationFrame(loop);
}

// ================= Start =================
try{buildCube();if(!load()){CUBE.resetLogic();syncFromLogic();}armed=!isSolved();}
catch(e){showErr(tr('err.load',{msg:e.message}));try{CUBE.resetLogic();syncFromLogic();}catch(_){}}
try{resize();}catch(e){showErr(tr('err.runtime',{msg:e.message}));}
try{updateUI();}catch(e){showErr(tr('err.runtime',{msg:e.message}));}
requestAnimationFrame(loop);
}
})();
