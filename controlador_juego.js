/* controlador_juego.js · El puente: entrada (puntero, botones, teclado), cronómetro y contadores del Reto,
   Modo Práctica, guardado, easter egg y bucle principal.
   Usa CUBO (logica_cubo.js), ENTRENADOR (entrenador.js) y MotorGrafico (motor_grafico.js). */

// Modo debug: mezclar desordena solo 1 giro (para probar rápido el final y el easter egg).
// Se activa aquí o abriendo la página con ?debug=true
const DEBUG_FLAG=false;

(function(){
const $=id=>document.getElementById(id);
// Muestra en pantalla cualquier error, para poder reportarlo
function showErr(msg){
  let b=document.getElementById('errbar');
  if(!b){b=document.createElement('div');b.id='errbar';b.setAttribute('role','alert');document.body.appendChild(b);}
  b.textContent=msg;
}
window.addEventListener('error',e=>showErr('Ocurrió un error: '+(e.message||'desconocido')+' · Recarga la página.'));
{const t=document.createElement('canvas');if(!(t.getContext('webgl')||t.getContext('experimental-webgl'))){
  showErr('Este navegador no puede mostrar el cubo 3D (WebGL desactivado). Prueba con Chrome, Safari, Edge o Firefox actualizados.');
  return;
}}
const DEBUG=DEBUG_FLAG||new URLSearchParams(location.search).get('debug')==='true';
const SCR=n=>DEBUG?1:n;
const KEY='cuboRubik.byarcy.v1'+(DEBUG?'.debug':'');
if(DEBUG){const l=document.querySelector('.logo');if(l){const s=document.createElement('span');s.className='debugtag';s.textContent='DEBUG';l.append(' ',s);}}

const {MOVES,FACE_OF,FACE_DIR,OPP,key,nz,isSolved,snapshot}=CUBO;
const LOOK=MotorGrafico.LOOK,COLHEX=LOOK.faces;
const stage=$('stage');
const G=MotorGrafico.crearEscena(stage);
const {canvas,scene,camera,container,camDir,rightW,upT,cubies,stickerMats,STICKER_GLOW,orientFrom,markDirty,normAng,animView,viewStart,viewDrag,viewTwist,turnView,stopSway,resize}=G;
const V=a=>new M3.Vector3(a[0],a[1],a[2]);

// ================= El cubo en la escena =================
// 2×2: piezas 1,5 veces más grandes, así el cubo mide lo mismo que el 3×3
let SC=1,OFF=1;
const piTex=(()=>{
  const c=document.createElement('canvas');c.width=c.height=128;
  const x=c.getContext('2d');x.fillStyle='rgba(10,6,20,1)';
  x.font='bold 92px Georgia, serif';x.textAlign='center';x.textBaseline='middle';x.fillText('π',64,70);
  return new M3.CanvasTexture(c);
})();
const piMats=G.decalMats;
function buildCube(){
  const size=CUBO.size,pieces=[];
  SC=size===2?1.5:1;OFF=size===2?0.75:1;
  CUBO.forEachPiece(p=>pieces.push({p,id:key(p)}));
  G.buildCube({pieces,scale:SC,offset:OFF,
    colorOf:d=>COLHEX[FACE_OF[key(d)]],
    // Easter egg: π tenue solo en el centro blanco
    decalOf:p=>(size===3?nz(p)===1&&p[1]===1:key(p)==='1,1,1')?piTex:null});
  focoId=undefined;focoMats=[];
}
const syncGroup=g=>G.syncGroup(g,CUBO.byId[g.userData.id]);
function syncFromLogic(){cubies.forEach(syncGroup);markDirty();}
function applySnap(s){CUBO.applySnap(s);syncFromLogic();}

// ================= Animación y cola =================
let queue=[],busy=false,scrambling=false;
function rotateLayer(f,dir,dur,done){
  const [a,l,s]=MOVES[f];const sg=s*dir;
  CUBO.quarter(f,dir);
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

// ================= Estado del juego =================
// mode: 'reto' o 'practica'; cada uno guarda su propio cubo en modeStates
let mode='reto',hist=[];
let modeStates={reto:null,practica:null};
const reto={state:'idle',base:0,start:0,moves:0,best:null};
let helpOpen=false,drawerOpen=false;
// El texto «Arrastra una cara…» se va cuando ya giraste una cara y el cubo entero
let tipDone=false,tipFace=false,tipView=false,glossTimer=0;

function retoTime(){return reto.state==='running'?reto.base+performance.now()-reto.start:reto.base;}
function fmt(ms){
  ms=Math.max(0,ms);
  const m=Math.floor(ms/60000),s=Math.floor(ms/1000)%60,cs=Math.floor(ms/10)%100;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(cs).padStart(2,'0');
}
// Qué cara del cubo es cada letra según cómo se ve ahora (U siempre es la que ves arriba)
function viewMap(){
  const wn={};
  for(const f in FACE_DIR)wn[f]=V(FACE_DIR[f]).applyQuaternion(container.quaternion);
  const pick=(ref,ex)=>{let b=null,bv=-2;for(const f in wn){if(ex.includes(f))continue;const v=wn[f].dot(ref);if(v>bv){bv=v;b=f;}}return b;};
  const F=pick(camDir,[]);
  const U=pick(upT,[F,OPP[F]]);
  const R=pick(rightW,[F,OPP[F],U,OPP[U]]);
  return {F,B:OPP[F],U,D:OPP[U],R,L:OPP[R]};
}
function canInput(){return !helpOpen&&!scrambling&&!exploded&&!resetAnim&&!(mode==='reto'&&reto.state==='paused');}

function userTurn(f,n){
  lastTouch=performance.now();
  if(!canInput())return;
  if(mode==='reto'){
    if(reto.state==='ready'){reto.state='running';reto.start=performance.now();reto.base=0;reto.moves=0;}
    if(reto.state==='running')reto.moves++;
  }
  hist.push({f,n});
  if(mode==='practica')pracMove({f,n});
  if(!tipDone){tipFace=true;tipDone=tipView;}
  enqueue(f,n,200);
  updateUI();
}
function userTurnView(letter,n){if(G.viewAnim)return;userTurn(viewMap()[letter],n);}
function undo(){
  if(!canInput())return;
  const m=hist.pop();if(!m)return;
  if(mode==='practica')pracMove({f:m.f,n:m.n===2?2:-m.n});
  enqueue(m.f,m.n===2?2:-m.n,200);
  updateUI();
}
function scramble(n){
  if(scrambling||busy||exploded)return;
  scrambling=true;hist=[];earned=false;armed=true;
  for(const m of CUBO.genScramble(n))(m.n===2?[1,1]:[m.n]).forEach(q=>queue.push({f:m.f,d:q,dur:55}));
  if(mode==='reto'){reto.state='scrambling';reto.base=0;reto.moves=0;}
  updateUI();pump();
}
function afterScramble(){
  if(mode==='reto'){reto.state='ready';reto.base=0;reto.moves=0;}
}
function afterMoves(){
  // Easter egg: solo cuando el cubo se resolvió con tus giros
  // Solo cuenta si el cubo se había mezclado: así el aviso y el easter egg salen una vez por armado
  const nowSolved=isSolved();let justSolved=false;
  if(armed&&nowSolved&&hist.length>0){armed=false;earned=true;justSolved=true;}
  if(!nowSolved)earned=false;
  let rec=false;
  if(mode==='reto'&&reto.state==='running'&&nowSolved){
    reto.base=retoTime();reto.state='done';
    if(reto.best==null||reto.base<reto.best){reto.best=reto.base;rec=true;}
  }
  if(justSolved)celebrate(mode==='reto'&&reto.state==='done'?fmt(reto.base)+(rec?' · ¡RÉCORD!':''):'');
  if(mode==='practica')pracAfter();
  updateUI();save();
}

// Aviso al completar el cubo: texto neón y un anillo de luz
function celebrate(sub){
  const m=$('solvedMsg'),r=$('solvedRing');
  m.innerHTML='¡MUY BIEN!'+(sub?'<small></small>':'');if(sub)m.querySelector('small').textContent=sub;
  [m,r].forEach(el=>{el.classList.remove('go');void el.offsetWidth;el.classList.add('go');});
  ensureAudio();
}

// ================= Modo Práctica =================
function iniciarModoPractica(){setMode('practica');}
// Cambia entre Reto y Práctica; cada modo conserva su propio cubo
function setMode(m){
  if(m===mode||helpOpen||busy||queue.length||scrambling||resetAnim)return;
  if(exploded){whenAssembled(()=>setMode(m));return;}
  if(m==='practica'&&CUBO.size!==3){setSize(3);if(CUBO.size!==3)return;}
  modeStates[mode]=snapshot();
  if(reto.state==='running'){reto.base=retoTime();reto.state='paused';}
  mode=m;openDrawer(false);cancelPress();hist=[];earned=false;armed=false;
  if(m==='practica'){
    applySnap(modeStates.practica);
    prac.obj=null;prac.fin=false;
    // sin ejercicio guardado (o ya terminado): se prepara uno nuevo
    if(!modeStates.practica||!lec().paso().plan){lec().generar();syncFromLogic();}
    pracPlan();pracVista();
  }else{
    applySnap(modeStates.reto);armed=!isSolved();
    animView(0,0,new M3.Quaternion(),450);
  }
  updateUI();save();
}

// ---- Lecciones (cruz blanca, esquinas blancas) ----
// leccion: cuál está abierta · hechos: ejercicios terminados de cada una
// nivel: 1 guiado (pieza, hueco, flecha y giros) · 2 solo la pieza y su hueco · 3 sin ayuda
// obj: pieza que toca · plan: giros de este paso · i: cuántos llevas · dev: giros de más que hay que deshacer
const prac={leccion:'cruz',nivel:1,hechos:{cruz:0,esquinas:0},obj:null,caso:null,plan:[],i:0,dev:[],fin:false};
const lec=()=>ENTRENADOR.LECCIONES[prac.leccion];
// true si moviste la vista tú (dedos o botón de cubo) después de que la app la acomodó: entonces no te la quita
let vistaUsuario=false;
// Textos de cada lección
const LEC_UI={
  cruz:{titulo:'CRUZ BLANCA',aviso:'CRUZ BLANCA COMPLETA',
    fin:'¡Cruz blanca completa! Toca <b>OTRO EJERCICIO</b> para repetirla, o pasa a la lección <b>2 · Esquinas</b>.',
    libre:'Arma la cruz blanca sin ayuda: las cuatro aristas blancas alrededor del centro blanco, cada una en la cara de su color.'},
  esquinas:{titulo:'ESQUINAS BLANCAS',aviso:'CAPA BLANCA COMPLETA',
    fin:'¡Capa blanca completa! Toca <b>OTRO EJERCICIO</b> para seguir practicando.',
    libre:'Coloca las cuatro esquinas blancas sin ayuda. La barra de arriba te avisa cuando la capa esté completa.'}
};
function setLeccion(l){
  if(l===prac.leccion||!ENTRENADOR.LECCIONES[l]||busy||queue.length||scrambling||resetAnim||exploded)return;
  prac.leccion=l;pracNuevo();
}
const esInverso=(a,b)=>a.f===b.f&&(b.n===2?a.n===2:a.n===-b.n);
// Lleva la cuenta del paso guiado con cada giro tuyo (y con cada deshacer)
function pracMove(m){
  if(prac.nivel!==1||prac.fin)return;
  const P=prac.plan,i=prac.i,D=prac.dev;
  if(D.length){if(esInverso(m,D[D.length-1]))D.pop();else D.push(m);return;}
  const sig=P[i];
  if(sig&&m.f===sig.f&&m.n===sig.n){prac.i++;return;}
  // una media vuelta hecha de cuarto en cuarto, hacia cualquier lado
  if(sig&&m.f===sig.f&&sig.n===2&&m.n!==2){P.splice(i,1,{f:m.f,n:m.n},{f:m.f,n:m.n});prac.i++;return;}
  if(i>0&&esInverso(m,P[i-1])){prac.i--;return;}
  // antes de empezar el paso (o al terminarlo) cualquier giro vale: el entrenador vuelve a mirar el cubo
  if(i===0||i>=P.length)return;
  D.push(m);
}
// Pregunta al entrenador qué toca; devuelve true si cambió de pieza
function pracPlan(){
  const e=lec().paso(prac.obj),antes=prac.obj;
  prac.plan=e.plan||[];prac.i=0;prac.dev=[];
  prac.caso=e.roto?'roto':e.listo?'listo':e.caso;
  if(e.id)prac.obj=e.id;
  if(e.listo){prac.obj=null;if(!prac.fin){prac.fin=true;prac.hechos[prac.leccion]++;celebrate(LEC_UI[prac.leccion].aviso);}}
  return !!e.id&&e.id!==antes;
}
// Con el cubo ya quieto: si no estás a medio paso, se vuelve a mirar el cubo
function pracAfter(){
  if(prac.fin)return;
  if(prac.nivel===1&&(prac.dev.length||(prac.i>0&&prac.i<prac.plan.length)))return;
  const cambio=pracPlan();
  // el cubo se acomoda solo si cambió la pieza o si la cara que toca girar quedó escondida (y no moviste tú la vista)
  if(!prac.fin&&prac.nivel<3&&(cambio||(prac.nivel===1&&!vistaUsuario&&!pracSeVe())))pracVista();
}
function pracNuevo(){
  if(helpOpen||busy||queue.length||scrambling||resetAnim||exploded)return;
  if(!lec().generar())return;
  syncFromLogic();hist=[];earned=false;armed=false;
  prac.obj=null;prac.fin=false;pracPlan();pracVista();
  updateUI();save();
}
// Vista de la lección: blanco arriba (como en la guía), y de frente las caras que toca girar, la pieza y su hueco
function pracVista(){
  vistaUsuario=false;
  const eje=new M3.Vector3(0,1,0),q=new M3.Quaternion(),meta=new M3.Vector3(1,0,1),dirs=[];
  for(const m of prac.plan)if(m.f!=='U'&&m.f!=='D')dirs.push([FACE_DIR[m.f],1]);
  if(prac.obj)dirs.push([CUBO.byId[prac.obj][0].p,1],[prac.obj.split(',').map(Number),0.6]);
  let y=G.yaw,mejor=-1e9;
  for(let k=0;k<4;k++){
    const a=k*Math.PI/2;q.setFromAxisAngle(eje,a);
    let s=-0.01*Math.abs(normAng(a-G.yaw));
    for(const [d,w] of dirs)s+=w*V(d).applyQuaternion(q).dot(meta);
    if(s>mejor){mejor=s;y=a;}
  }
  animView(y,0,new M3.Quaternion(),500);
}
// ¿Se ven ahora todas las caras que hay que girar en este paso?
function pracSeVe(){
  const vm=viewMap(),vis=[vm.U,vm.F,vm.R];
  return prac.plan.every(m=>vis.includes(m.f));
}

// ---- Ayudas dibujadas sobre el cubo: pieza en foco, marco del hueco y flecha del giro ----
let focoId,focoMats=[];
// Atenúa todas las calcomanías menos las de las piezas «id» (varias separadas por «|»; null = todo normal)
function setFoco(id){
  if(id===focoId)return;
  const ids=id?id.split('|'):[];
  focoId=id;focoMats=[];
  for(const g of cubies){
    const on=!id||ids.includes(g.userData.id);
    for(const ch of g.children){
      if(!ch.userData.st)continue;
      const mt=ch.material;
      if(mt.userData.hex==null){const c=mt.color;mt.userData.hex=(Math.round(c.r*255)<<16)|(Math.round(c.g*255)<<8)|Math.round(c.b*255);}
      const k=on?1:0.3;
      for(const c of [mt.color,mt.emissive]){c.setHex(mt.userData.hex);c.r*=k;c.g*=k;c.b*=k;}
      if(g.userData.id===ids[0])focoMats.push(mt);
    }
  }
  markDirty();
}
function lienzo(fn){
  const c=document.createElement('canvas');c.width=c.height=256;
  fn(c.getContext('2d'));return new M3.CanvasTexture(c);
}
// Flecha circular en sentido horario (espejo = antihorario)
const flechaTex=espejo=>lienzo(x=>{
  if(espejo){x.translate(256,0);x.scale(-1,1);}
  x.lineCap='round';x.lineJoin='round';
  const a0=-Math.PI*0.8,a1=Math.PI*0.55,r=82,ex=128+r*Math.cos(a1),ey=128+r*Math.sin(a1);
  const tx=-Math.sin(a1),ty=Math.cos(a1),nx=Math.cos(a1),ny=Math.sin(a1);
  const trazo=(w,col,p)=>{
    x.strokeStyle=x.fillStyle=col;x.lineWidth=w;
    x.beginPath();x.arc(128,128,r,a0,a1);x.stroke();
    x.beginPath();x.moveTo(ex+tx*(44+p),ey+ty*(44+p));x.lineTo(ex+nx*(34+p)-tx*4,ey+ny*(34+p)-ty*4);x.lineTo(ex-nx*(34+p)-tx*4,ey-ny*(34+p)-ty*4);x.closePath();x.fill();
  };
  trazo(34,'rgba(13,2,33,.92)',10);trazo(16,'#00e5ff',0);
});
const marcoTex=lienzo(x=>{
  const rr=(m,w,col)=>{
    const a=m,b=256-m,r=34;
    x.strokeStyle=col;x.lineWidth=w;x.beginPath();
    x.moveTo(a+r,a);x.arcTo(b,a,b,b,r);x.arcTo(b,b,a,b,r);x.arcTo(a,b,a,a,r);x.arcTo(a,a,b,a,r);x.closePath();x.stroke();
  };
  rr(22,30,'rgba(13,2,33,.9)');rr(22,14,'#ff2e97');
});
const ZV=new M3.Vector3(0,0,1);
function marca(tex,tam){
  const m=new M3.Mesh(new M3.PlaneGeometry(tam,tam),new M3.MeshBasicMaterial({map:tex,transparent:true,opacity:1,depthWrite:false}));
  m.material.side=2;m.visible=false;m.material.visible=false;m.renderOrder=5;container.add(m);return m;
}
// Flecha recta para la capa de abajo (no se ve desde arriba): se pega en la fila de abajo de las caras que sí se ven
const flechaRectaTex=lienzo(x=>{
  x.lineCap='round';x.lineJoin='round';
  const trazo=(w,col,p)=>{
    x.strokeStyle=x.fillStyle=col;x.lineWidth=w;
    x.beginPath();x.moveTo(34,128);x.lineTo(176,128);x.stroke();
    x.beginPath();x.moveTo(226+p,128);x.lineTo(148-p/2,64-p);x.lineTo(148-p/2,192+p);x.closePath();x.fill();
  };
  trazo(34,'rgba(13,2,33,.92)',10);trazo(16,'#00e5ff',0);
});
const flechas=[marca(flechaTex(false),2.5),marca(flechaTex(true),2.5)],marcos=[0,1,2].map(()=>marca(marcoTex,1)),flechasD=[marca(flechaRectaTex,1.9),marca(flechaRectaTex,1.9)];
let flechaDG=null;
// La capa de abajo gira en el sentido de «D»: el frente se va hacia la derecha. En cada cara lateral visible,
// la flecha apunta hacia donde se mueven sus piezas (D' al revés).
function flechaD(g){
  let k=0;
  if(g){
    const s=g.n===-1?-1:1;
    for(const f of ['F','R','B','L']){
      const n=FACE_DIR[f];
      if(V(n).applyQuaternion(container.quaternion).dot(camDir)<0.25||k>=2)continue;
      const m=flechasD[k++],t=[n[2]*s,0,-n[0]*s];
      m.quaternion.setFromRotationMatrix(new M3.Matrix4().makeBasis(V(t),new M3.Vector3().crossVectors(V(n),V(t)),V(n)));
      m.position.set(n[0]*1.56,-1,n[2]*1.56);
      m.visible=m.material.visible=true;
    }
  }
  for(;k<2;k++)flechasD[k].visible=flechasD[k].material.visible=false;
  markDirty();
}
function ponMarca(m,ver,pos,dir,esc=1){
  m.visible=m.material.visible=ver;
  if(ver){m.position.set(pos[0],pos[1],pos[2]);m.quaternion.setFromUnitVectors(ZV,V(dir));m.scale.setScalar(esc);}
}
// El giro que toca ahora en el paso guiado: el siguiente del plan o, si te saliste, el que lo deshace
function pracSig(){
  const D=prac.dev;
  if(D.length){const t=D[D.length-1];return {f:t.f,n:t.n===2?2:-t.n};}
  return prac.plan[prac.i]||null;
}
function pracVisual(on){
  const ayuda=!!on&&!prac.fin&&prac.caso!=='roto'&&!!prac.obj;
  const foco=ayuda&&prac.nivel<3;
  const h=foco?prac.obj.split(',').map(Number):null;
  // en la cruz también queda encendido el centro de la cara adonde va la arista
  setFoco(foco?prac.obj+(prac.leccion==='cruz'?'|'+key([h[0],0,h[2]]):''):null);
  marcos.forEach((m,a)=>{
    const d=[0,0,0];if(h)d[a]=h[a];
    const ver=!!h&&h[a]!==0;
    ponMarca(m,ver,ver&&h.map((v,i)=>v+d[i]*0.54),d);
  });
  const g=ayuda&&prac.nivel===1?pracSig():null;
  flechaDG=g&&g.f==='D'?g:null;
  flechaD(flechaDG);
  flechas.forEach((m,i)=>{
    const ver=!!g&&g.f!=='D'&&(g.n===-1)===(i===1),d=g?FACE_DIR[g.f]:null;
    ponMarca(m,ver,d&&d.map(v=>v*1.56),d);
  });
  markDirty();
}

// ---- Panel de la lección ----
const COLOR_ES={U:'blanco',D:'amarillo',F:'verde',B:'azul',R:'rojo',L:'naranja'};
const HACIA={U:'hacia arriba',D:'hacia abajo',F:'hacia el frente',B:'hacia atrás',R:'hacia la derecha',L:'hacia la izquierda'};
const CAPA={U:'de arriba',D:'de abajo',F:'del frente',B:'de atrás',R:'derecha',L:'izquierda'};
const giroTxt=(m,L)=>L[m.f]+(m.n===-1?"'":m.n===2?'2':'');
function pracRender(){
  // Barra de etapas
  const n=CUBO.etapa(),E=CUBO.ETAPAS,box=$('etapas');
  if(!box.children.length)E.forEach(()=>box.appendChild(document.createElement('i')));
  [...box.children].forEach((el,i)=>{el.className=i<n?'on':i===n?'cur':'';});
  box.setAttribute('aria-label',n+' de '+E.length+' etapas completas');
  $('etapaTxt').innerHTML=n<E.length?'Etapa '+(n+1)+' de '+E.length+' · <b>'+E[n].nombre+'</b>':'<b>Cubo armado</b>';
  document.querySelectorAll('#niveles button').forEach(b=>b.classList.toggle('on',+b.dataset.nv===prac.nivel));
  document.querySelectorAll('#lecciones button').forEach(b=>b.classList.toggle('on',b.dataset.lec===prac.leccion));
  const T=LEC_UI[prac.leccion],hechos=prac.hechos[prac.leccion];
  $('pracTitle').textContent=T.titulo;
  $('pracCount').textContent=hechos?hechos+(hechos===1?' ejercicio hecho':' ejercicios hechos'):'';
  // Letras según se ve el cubo ahora: cara del modelo → letra
  const vm=viewMap(),L={};for(const l in vm)L[vm[l]]=l;
  let msg='',chips=[];
  const sts=prac.obj&&CUBO.byId[prac.obj];
  const nombre=sts?'<b>'+sts.map(s=>s.c).sort((a,b)=>(b==='U')-(a==='U')).map(c=>COLOR_ES[c]).join('-')+'</b>':'';
  const centro=sts&&sts.find(s=>s.c!=='U'),cara=centro?'<b>'+COLOR_ES[centro.c]+'</b>':'';
  const pieza=(prac.leccion==='cruz'?'La arista ':'La esquina ')+nombre;
  if(prac.fin)msg=T.fin;
  else if(prac.caso==='roto')msg='La cruz blanca se desarmó. Toca <b>deshacer</b> hasta recuperarla.';
  else if(prac.nivel===3)msg=T.libre;
  else if(prac.dev.length)msg='Ese giro no era. Toca <b>deshacer</b> y seguimos.';
  else if(prac.caso==='cruzSacar')msg=pieza+' está en la capa blanca, pero mal puesta. Media vuelta a esa cara la lleva a la capa '+CAPA[L.D]+'.';
  else if(prac.caso==='cruzMedio')msg=pieza+' está en la capa del medio. Llévala a la capa '+CAPA[L.D]+' con 3 giros: el último devuelve a su sitio lo que movió el primero.';
  else if(prac.leccion==='cruz'&&prac.caso==='alinear')msg=pieza+' está iluminada. Gira la capa '+CAPA[L.D]+' hasta dejarla en la cara del centro '+cara+'.';
  else if(prac.caso==='cruzSubir')msg=pieza+' ya está en la cara del centro '+cara+' y el blanco mira '+HACIA[L.D]+'. Media vuelta a esa cara y queda en su sitio.';
  else if(prac.caso==='cruzVolteada')msg=pieza+' está en la cara del centro '+cara+', pero volteada: el blanco mira a un costado. Estos 4 giros la meten al derecho.';
  else if(prac.caso==='alinear')msg='La esquina '+nombre+' está iluminada. Gira la capa '+CAPA[L.D]+' hasta dejarla frente a su hueco, el del marco rosa.';
  else if(prac.caso==='sacar')msg='La esquina '+nombre+' está en la capa blanca, pero mal puesta. Sácala con 3 giros y después la colocamos.';
  else if(prac.caso==='esqFuera')msg='La esquina '+nombre+' está frente a su hueco y el blanco mira '+HACIA[L.D]+'. Son 7 giros: los 4 primeros la voltean y los 3 últimos la meten.';
  else if(sts)msg='La esquina '+nombre+' está frente a su hueco y el blanco mira '+HACIA[L[FACE_OF[key(sts.find(s=>s.c==='U').n)]]]+'. Entra con 3 giros.';
  if(prac.nivel===1&&!prac.fin&&prac.caso!=='roto'){
    if(prac.dev.length)chips=[['bad',giroTxt(pracSig(),L)]];
    else chips=prac.plan.map((m,i)=>[i<prac.i?'done':i===prac.i?'cur':'',giroTxt(m,L)]);
  }
  $('pracMsg').innerHTML=msg;
  const seq=$('pracSeq');seq.textContent='';seq.hidden=prac.nivel!==1;
  for(const [cls,t] of chips){const s=document.createElement('span');s.className=cls;s.textContent=t;seq.appendChild(s);}
  pracVisual(true);
}

// ================= Interacción con el puntero =================
const ray=new M3.Raycaster(),ndc=new M3.Vector2();
let pd=null;
function setNDC(e){const r=canvas.getBoundingClientRect();ndc.x=((e.clientX-r.left)/r.width)*2-1;ndc.y=-((e.clientY-r.top)/r.height)*2+1;}
function groupOf(o){while(o&&!o.userData.id)o=o.parent;return o;}
// Las 24 orientaciones rectas del cubo
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
  vistaUsuario=true;
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
  // El recuadro de la esquina (vista trasera) no gira nada
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
    // Dos dedos: siempre se mueve el cubo entero, como en la mano
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
    // Queda un dedo: se ignora hasta soltar todo, así no hay brincos
    pd.type='multiEnd';
  }
}
canvas.addEventListener('pointerup',endPointer);
canvas.addEventListener('pointercancel',endPointer);
// Botón de cubo: 1 toque = enderezar sin dar la vuelta; 2 toques o mantener = posición inicial (blanco arriba)
{
  const b=$('restore');let t=0,long=false,lastTap=0;
  const home=()=>{vistaUsuario=true;showTipFor(b,'Posición inicial');animView(0,0,new M3.Quaternion(),450);};
  b.addEventListener('pointerdown',()=>{
    long=false;clearTimeout(t);
    t=setTimeout(()=>{long=true;lastTap=0;home();},550);
  });
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>clearTimeout(t)));
  b.addEventListener('click',()=>{
    if(long){long=false;return;}
    const now=performance.now();
    if(now-lastTap<400){lastTap=0;home();return;}
    lastTap=now;vistaUsuario=true;
    // Enderezar: giro al cuarto de vuelta más cercano y sin inclinación (o de cabeza)
    const yaw=G.yaw,pitch=G.pitch;
    const y1=Math.round(yaw/(Math.PI/2))*(Math.PI/2),p1=Math.abs(pitch)>Math.PI/2?Math.PI*Math.sign(pitch):0;
    if(Math.abs(normAng(y1-yaw))<0.01&&Math.abs(normAng(p1-pitch))<0.01&&Math.abs(normAng(G.roll))<0.01)showTipFor(b,'Ya está derecho · toca dos veces para la posición inicial');
    animView(y1,p1,G.base,380);
  });
}

// ================= Guardado =================
function setSaved(ok){const e=$('saved');e.setAttribute('aria-label',ok?'Progreso guardado':'Sin guardar');e.style.opacity=ok?'1':'0.3';}
// Cada tamaño (3×3 y 2×2) guarda su propio cubo, paso, tiempo y récord
const other={2:null,3:null};
function retoSave(){return {state:reto.state==='running'?'paused':(reto.state==='scrambling'?'idle':reto.state),base:retoTime(),moves:reto.moves,best:reto.best};}
function retoLoad(r){reto.state=r&&r.state||'idle';reto.base=r&&r.base||0;reto.moves=r&&r.moves||0;reto.best=r&&r.best!=null?r.best:null;}
function save(){
  try{
    modeStates[mode]=snapshot();
    const d={v:1,sz:CUBO.size,alt:other[CUBO.size===3?2:3],mode,hist:hist.slice(-300),view:G.getView(),tipDone,states:modeStates,reto:retoSave(),prac:{leccion:prac.leccion,nivel:prac.nivel,hechos:prac.hechos}};
    localStorage.setItem(KEY,JSON.stringify(d));setSaved(true);
  }catch(e){setSaved(false);}
}
function load(){
  try{
    const d=JSON.parse(localStorage.getItem(KEY)||'null');
    if(!d||d.v!==1)return false;
    CUBO.size=d.sz;other[CUBO.size===3?2:3]=d.alt||null;
    if(CUBO.size===2)buildCube();
    tipDone=d.tipDone===true;
    modeStates={reto:d.states&&d.states.reto||null,practica:d.states&&d.states.practica||null};
    if(d.prac){
      const num=v=>Math.max(0,Math.floor(+v)||0),hh=d.prac.hechos;
      prac.nivel=[1,2,3].includes(d.prac.nivel)?d.prac.nivel:1;
      // antes solo existía la lección de esquinas y «hechos» era un número
      prac.leccion=ENTRENADOR.LECCIONES[d.prac.leccion]?d.prac.leccion:'esquinas';
      prac.hechos=hh&&typeof hh==='object'?{cruz:num(hh.cruz),esquinas:num(hh.esquinas)}:{cruz:0,esquinas:num(hh)};
    }
    const okQ=a=>Array.isArray(a)&&a.length===4&&a.every(v=>typeof v==='number'&&isFinite(v));
    if(d.view&&okQ(d.view.base))G.setView(+d.view.yaw||0,+d.view.pitch||0,d.view.base,+d.view.roll||0);
    if(d.reto)retoLoad(d.reto);
    applySnap(modeStates[mode]);
    // el historial solo sirve si se guardó en este mismo modo
    if(Array.isArray(d.hist)&&d.mode===mode)hist=d.hist.filter(CUBO.isMove).map(m=>({f:m.f,n:m.n}));
    return true;
  }catch(e){return false;}
}
function setSize(n){
  const size=CUBO.size;
  if(n===size||busy||queue.length||scrambling||resetAnim)return;
  if(exploded){whenAssembled(()=>setSize(n));return;}
  modeStates[mode]=snapshot();
  if(reto.state==='running'){reto.base=retoTime();reto.state='paused';}
  other[size]={states:modeStates,reto:retoSave()};
  const o=other[n]||{};other[n]=null;
  CUBO.size=n;cancelPress();buildCube();
  modeStates=o.states||{reto:null,practica:null};retoLoad(o.reto);
  applySnap(modeStates[mode]);hist=[];earned=false;armed=!isSolved();
  showTipFor($('sizeBtn'),n===2?'Cubo 2×2':'Cubo 3×3');
  updateUI();save();
}

// ================= Interfaz =================
function updateUI(){
  markDirty();
  const size=CUBO.size;
  const app=$('app'),wasReto=app.classList.contains('m-reto');
  app.classList.toggle('m-reto',mode==='reto');
  if(wasReto!==(mode==='reto'))requestAnimationFrame(resize);
  $('tabReto').classList.toggle('on',mode==='reto');
  $('tabPrac').classList.toggle('on',mode==='practica');
  $('sizeBtn').textContent=size+'×'+size;$('sizeBtn').setAttribute('aria-label','Cubo '+size+'×'+size+'; toca para cambiar a '+(size===3?'2×2':'3×3'));
  $('retoBar').hidden=mode!=='reto';
  $('retoPanel').hidden=mode!=='reto';
  $('pracBar').hidden=$('pracPanel').hidden=mode!=='practica';
  {const b=$('bScr'),t=mode==='practica'?'Otro ejercicio':'Mezclar';b.dataset.tip=t;b.setAttribute('aria-label',t);}
  if(mode==='practica')pracRender();else pracVisual(false);
  $('pauseOv').hidden=!(mode==='reto'&&reto.state==='paused');
  // Reto
  $('tmoves').textContent=reto.moves;
  $('tbest').textContent=reto.best==null?'--:--.--':fmt(reto.best);
  const rm={idle:'Toca MEZCLAR para empezar un reto.',scrambling:'Mezclando…',ready:'Listo. El tiempo empieza con tu primer giro.',running:'¡Vamos!',paused:'En pausa.',done:'¡Resuelto en '+fmt(reto.base)+' con '+reto.moves+' movimientos!'};
  $('retoMsg').textContent=rm[reto.state]||'';
  $('pauseIco').innerHTML=reto.state==='paused'?'<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#00e5ff" stroke="#00e5ff" stroke-width="2" stroke-linejoin="round"><path d="M8 5l11 7-11 7z"></path></svg>':'<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" stroke-width="2.6" stroke-linecap="round"><path d="M9 5v14M15 5v14"></path></svg>';
  $('rPause').setAttribute('aria-label',reto.state==='paused'?'Seguir':'Pausa');$('rPause').dataset.tip=reto.state==='paused'?'Seguir':'Pausa';
  $('rPause').disabled=!(reto.state==='running'||reto.state==='paused');
}

// Botones
$('tabPrac').onclick=iniciarModoPractica;
$('tabReto').onclick=()=>setMode('reto');
$('pracNew').onclick=pracNuevo;
document.querySelectorAll('#lecciones button').forEach(b=>b.onclick=()=>setLeccion(b.dataset.lec));
document.querySelectorAll('#niveles button').forEach(b=>b.onclick=()=>{
  prac.nivel=+b.dataset.nv;
  if(!prac.fin&&!busy&&!queue.length){pracPlan();if(prac.nivel<3)pracVista();}
  updateUI();save();
});
// Mantener presionado un ícono muestra su nombre (y no lo activa)
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
// Mezclar pide un segundo toque si el cubo ya tiene avance
let scrArm=0,scrTimer=0;
function shuffleTap(){
  if(helpOpen||busy||queue.length||scrambling)return;
  if(mode==='practica'){pracNuevo();return;}
  if(exploded){rearm();return;}
  const b=$('bScr');
  if(resetAnim)return;
  if(!isSolved()&&performance.now()>scrArm){
    scrArm=performance.now()+2500;b.classList.add('arm');showTipFor(b,'¿Empezar de nuevo? Toca otra vez');
    clearTimeout(scrTimer);scrTimer=setTimeout(()=>{b.classList.remove('arm');scrArm=0;},2500);
    return;
  }
  scrArm=0;b.classList.remove('arm');clearTimeout(scrTimer);
  // Con el cubo desarmado: primero se vuelve a armar solo, para verlo ordenado como al abrir la app
  if(!isSolved()){resetToSolved();return;}
  scramble(SCR(CUBO.size===2?11:25));
}
tap('bScr',shuffleTap);
function resetToSolved(){
  if(busy||queue.length||scrambling||resetAnim||exploded)return;
  openDrawer(false);cancelPress();
  const items=cubies.map(g=>{const h=g.userData.id.split(',').map(Number);return {g,p0:g.position.clone(),q0:g.quaternion.clone(),p1:new M3.Vector3(h[0]*OFF,h[1]*OFF,h[2]*OFF),delay:Math.random()*0.22};});
  CUBO.resetLogic();hist=[];earned=false;armed=false;
  if(mode==='reto'){reto.state='idle';reto.base=0;reto.moves=0;}
  resetAnim={t0:performance.now(),items};
  animView(0,0,new M3.Quaternion(),800);
  updateUI();
}
tap('bUndo',undo);
tap('bGiros',()=>openDrawer(!drawerOpen));
tap('rPause',()=>{
  if(reto.state==='running'){reto.base=retoTime();reto.state='paused';}
  else if(reto.state==='paused'){reto.start=performance.now();reto.state='running';}
  updateUI();save();
});
tap('sizeBtn',()=>{
  if(mode==='practica'){showTipFor($('sizeBtn'),'La práctica usa el cubo 3×3');return;}
  setSize(CUBO.size===3?2:3);
});

function openDrawer(o){drawerOpen=o;$('drawer').classList.toggle('open',o);$('drawer').setAttribute('aria-hidden',o?'false':'true');}
$('dClose').onclick=()=>openDrawer(false);
const mg=$('mgrid');
[['',1,''],["'",-1,' p'],['2',2,' d']].forEach(([suf,n,cls])=>{
  'RLUDFB'.split('').forEach(f=>{
    const b=document.createElement('button');
    b.className='mv'+cls;b.textContent=f+suf;
    b.onclick=()=>userTurnView(f,n);
    mg.appendChild(b);
  });
});
$('helpBtn').onclick=()=>{helpOpen=true;$('help').hidden=false;};
$('hClose').onclick=()=>{helpOpen=false;$('help').hidden=true;};
// Ayuda: pestañas
document.querySelectorAll('.htabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.htabs button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('[data-hp]').forEach(sec=>sec.hidden=sec.dataset.hp!==b.dataset.ht);
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
// ---- Sonido: bus con compresor y reverb para que nada suene chillón ----
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
// Carga: acorde cálido (La menor) que sube y se abre poco a poco
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
// Explosión: golpe grave, ráfaga con eco y acorde brillante que se apaga
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

// ---- Varillas de neón en 3D sobre los bordes de cada pieza ----
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
// Chispas que se juntan hacia el cubo al final de la carga
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
// Destello de luz al explotar
const flashLight=new M3.PointLight(0xffffff,0,14);scene.add(flashLight);
let flashT=0;
const FLOOR=LOOK.floorY;
// Las piezas caen sobre el piso dibujado (franja baja del escenario): se corrige su huella en pantalla
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
// Choques entre piezas: no se atraviesan; si no caben en el piso, se apilan. Quietas, se "duermen" y ya no se mueven.
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
        // una sobre otra: la de arriba se apoya
        let up=dy>0?B:A,dn=up===A?B:A;
        if(up.userData.sleep){up.userData.sleep=false;up.userData.still=0;}
        up.position.y+=pv;const u=up.userData;
        if(u.v.y<0)u.v.y=0;u.v.x*=0.9;u.v.z*=0.9;u.rest=true;
        // si quedó en el borde de la de abajo, resbala hacia afuera
        if(h>0.3*SC&&(u.slid=(u.slid||0)+1)<120){const sx=(up.position.x-dn.position.x)/h,sz=(up.position.z-dn.position.z)/h;u.v.x+=sx*0.12;u.v.z+=sz*0.12;}
      }else{
        // lado a lado: se separan en horizontal
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
    // al principio las piezas salen juntas: los choques empiezan cuando ya se separaron
    if(performance.now()-boomT>350)for(let k=0;k<3;k++)collide();
    for(const g of cubies){
      const u=g.userData;if(!u.v)continue;
      if(!u.sleep&&g.position.y<FLOOR+2.6)keepOnDrawnFloor(g,u.v);
      if(u.rest&&!u.flat){
        // apoyada: se acuesta sobre una cara, como una pieza real
        let best=SNAPS[0],bv=-1;for(const sn of SNAPS){const d=Math.abs(g.quaternion.dot(sn));if(d>bv){bv=d;best=sn;}}
        const r=g.quaternion.clone().multiply(best.clone().invert());const tw=new M3.Quaternion(0,r.y,0,r.w);
        u.flat=tw.lengthSq()>1e-6?tw.normalize().multiply(best):best.clone();
      }
      if(u.flat&&(u.rest||u.sleep))g.quaternion.slerp(u.flat,0.12);
      if(u.sleep)continue;
      if(u.rest){u.v.x*=0.9;u.v.z*=0.9;u.w.multiplyScalar(0.85);}
      const ang=u.w.length()*dt;
      if(ang>1e-5)g.quaternion.premultiply(_qs.setFromAxisAngle(_ws.copy(u.w).normalize(),ang));
      // quieta un rato: se duerme
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
// Hace algo cuando el cubo vuelve a estar armado (si explotó, lo arma primero)
let afterRearm=null;
function whenAssembled(fn){if(!exploded){fn();return;}afterRearm=fn;rearm();}
function rearm(){
  if(!exploded||rearmAnim)return;
  ensureAudio();
  $('rearm').hidden=true;
  container.updateMatrixWorld(true);
  rearmAnim={t0:performance.now(),items:cubies.map(g=>{
    const sts=CUBO.byId[g.userData.id];
    const tp=new M3.Vector3(sts[0].p[0]*OFF,sts[0].p[1]*OFF,sts[0].p[2]*OFF).applyMatrix4(container.matrixWorld);
    const tq=container.quaternion.clone().multiply(orientFrom(sts));
    return {g,p0:g.position.clone(),q0:g.quaternion.clone(),tp,tq,delay:Math.random()*0.25};
  })};
}
$('rearm').onclick=rearm;
// Vitrina: giro suave y aleatorio para que el blanco (y el π) aparezca de vez en cuando
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
  // π muy tenue que parpadea lentamente, solo con el cubo resuelto por ti
  const target=(earned&&isSolved()&&!exploded)?0.15*(0.5-0.5*Math.cos(now*2*Math.PI/6500)):0;
  for(const m of piMats)m.opacity+=(target-m.opacity)*Math.min(1,dt/200);
  if(press){
    const el=now-press.t0;
    if(el>500){
      if(!press.snd)press.snd=chargeSound();
      const prog=Math.min(1,(el-500)/(PI_MS-500));
      updateRods(prog,now);
      // el cubo vibra cada vez más y las piezas se iluminan
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
      showTipFor($('bScr'),'Toca mezclar para empezar');}
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

// ================= Bucle principal =================
window.addEventListener('resize',resize);
let lastFrame=0;
function loopBody(now){
  if(G.stepView(now)){updateUI();save();}
  for(const m of stickerMats)m.emissiveIntensity=STICKER_GLOW;
  for(const m of focoMats)m.emissiveIntensity=0.42;
  // la flecha recta sigue al cubo mientras lo giras
  if(flechaDG&&(G.viewAnim||G.inertia||pd))flechaD(flechaDG);
  const dt=Math.min(50,now-(lastFrame||now));lastFrame=now;
  eggFrame(now,dt);
  // Tras unos segundos sin tocar el cubo, se mece un poco
  G.idleSway(now,dt,!pd&&!busy&&!queue.length&&!scrambling&&!G.viewAnim&&!G.inertia&&!exploded&&!rearmAnim&&!resetAnim&&!press&&!showcase&&!helpOpen&&now-lastTouch>6000);
  const tip=$('tip');
  const tipTxt=tipDone?'':'Arrastra una cara para girarla · fuera del cubo para girarlo entero';
  if(tip.textContent!==tipTxt){tip.textContent=tipTxt;tip.hidden=!tipTxt;}
  if(mode==='reto')setClock(fmt(retoTime()));
  // Hasta 60 cuadros por segundo mientras algo se mueve, 30 en las animaciones lentas y ninguno si nada cambia
  const moving=exploded&&!rearmAnim&&cubies.some(g=>g.userData.v&&!g.userData.sleep);
  const fast=busy||queue.length||G.viewAnim||G.inertia||pd||press||moving||sparks||rearmAnim||resetAnim||flashT||inflow;
  const slow=G.swayAmp>0||showcase||piMats.some(m=>m.opacity>0.002);
  if(G.isDirty()||now-lastDraw>=(fast?15:slow?32:Infinity)){lastDraw=now;G.render();}
}
let lastDraw=0;
// Reloj del Reto: una celda de ancho fijo por carácter; solo cambia la cifra que cambió
let clockCells=null;
function setClock(s){
  const el=$('tval');
  if(!clockCells||clockCells.length!==s.length){
    el.textContent='';el.setAttribute('aria-label',s);
    clockCells=[...s].map(ch=>{const sp=document.createElement('span');if(ch===':'||ch==='.')sp.className='sep';sp.setAttribute('aria-hidden','true');sp.textContent=ch;el.appendChild(sp);return sp;});
    return;
  }
  for(let i=0;i<s.length;i++)if(clockCells[i].textContent!==s[i])clockCells[i].textContent=s[i];
  if(s[s.length-1]==='0')el.setAttribute('aria-label',s);
}
// El cubo se sigue dibujando aunque falle alguna otra parte
let errShown=false;
function loop(now){
  try{loopBody(now);}
  catch(err){if(!errShown){errShown=true;showErr('Error: '+(err&&err.message||err)+' · Recarga la página.');}try{G.render();}catch(e){}}
  requestAnimationFrame(loop);
}

// ================= Inicio =================
try{buildCube();if(!load()){CUBO.resetLogic();syncFromLogic();}armed=!isSolved();}
catch(e){showErr('Error al cargar tu avance: '+e.message+'. Empecé con un cubo nuevo.');try{CUBO.resetLogic();syncFromLogic();}catch(_){}}
try{resize();}catch(e){showErr('Error: '+e.message);}
try{updateUI();}catch(e){showErr('Error: '+e.message+' · Recarga la página.');}
requestAnimationFrame(loop);
})();
