/* entrenador.js · El «profe» del Modo Práctica: mira el cubo y dice qué pieza toca y con qué giros.
   Solo lógica: no dibuja ni conoce la interfaz. Usa CUBO (logica_cubo.js) y ALGORITMOS (algoritmos.js).
   Todo se expresa en caras del modelo (blanco = U, amarillo = D); la interfaz lo traduce a como se ve el cubo.
   Expone un único objeto global: ENTRENADOR. */
const ENTRENADOR=(function(){
const {key,FACE_OF,parseSeq}=CUBO;
// Los cuatro huecos de la capa blanca, en el orden en que los recorre girar el cubo sobre su eje vertical
const HUECOS=['1,1,1','-1,1,1','-1,1,-1','1,1,-1'];
const ROT={R:'F',F:'L',L:'B',B:'R',U:'U',D:'D'};
// Traslada una secuencia escrita para el hueco U-R-F al hueco k
function girar(seq,k){
  return seq.map(m=>{let f=m.f;for(let i=0;i<k;i++)f=ROT[f];return {f,n:m.n};});
}
function aplicar(seq){
  for(const m of seq){CUBO.quarter(m.f,m.n===2?1:m.n);if(m.n===2)CUBO.quarter(m.f,1);}
}
const sec=(nombre,k)=>girar(parseSeq(ALGORITMOS.capas[nombre].sec),k);
const azar=n=>Math.floor(Math.random()*n);

// ================= Esquinas blancas =================
// Mira una esquina blanca y devuelve su caso y los giros que la acercan a su hueco:
//   sacar   · está en la capa blanca pero mal puesta: hay que bajarla a la capa amarilla
//   alinear · está en la capa amarilla, pero no frente a su hueco
//   esqDer / esqFrente / esqFuera · está frente a su hueco; el caso depende de hacia dónde mira el blanco
function casoEsquina(id){
  const sts=CUBO.byId[id],p=sts[0].p,h=id.split(',').map(Number);
  if(p[1]===1){
    return {id,caso:'sacar',plan:sec('esqSacar',HUECOS.indexOf(key([p[0],1,p[2]]))),coste:2};
  }
  if(p[0]!==h[0]||p[2]!==h[2]){
    let c=0;
    do{CUBO.quarter('D',1);c++;}while(c<4&&(CUBO.byId[id][0].p[0]!==h[0]||CUBO.byId[id][0].p[2]!==h[2]));
    for(let i=0;i<c;i++)CUBO.quarter('D',-1);
    return {id,caso:'alinear',plan:[{f:'D',n:c===3?-1:c}],coste:1};
  }
  const k=HUECOS.indexOf(id),blanco=sts.find(s=>s.hn[1]===1).n;
  const caso=blanco[1]===-1?'esqFuera':FACE_OF[key(blanco)]===girar([{f:'R',n:1}],k)[0].f?'esqDer':'esqFrente';
  return {id,caso,plan:sec(caso,k),coste:0};
}
// Qué esquina toca ahora. «actual» (opcional) se mantiene mientras no esté resuelta, para no saltar de pieza.
// Devuelve {roto:true} si la cruz blanca no está, {listo:true} si la capa está completa, o el caso de casoEsquina.
function esquinas(actual){
  if(!CUBO.ETAPAS[0].ok())return {roto:true};
  const faltan=HUECOS.filter(id=>!CUBO.resuelta(id));
  if(!faltan.length)return {listo:true};
  if(actual&&faltan.includes(actual))return casoEsquina(actual);
  return faltan.map(casoEsquina).sort((a,b)=>a.coste-b.coste)[0];
}
// Termina la capa blanca sin animación (para preparar ejercicios)
function resolverEsquinas(){
  for(let i=0;i<80;i++){
    const e=esquinas();
    if(!e.plan)return !!e.listo;
    aplicar(e.plan);
  }
  return false;
}
// Un «gatillo» en un hueco al azar: saca la esquina que haya ahí y mete la que esté debajo. No rompe la cruz.
function gatillo(){
  aplicar(sec(azar(2)?'esqDer':'esqFrente',azar(4)));
  aplicar([{f:'D',n:[1,-1,2][azar(3)]}]);
}
// Ejercicio: cruz blanca hecha, segunda y tercera capa revueltas y varias esquinas blancas fuera de sitio
function generarEsquinas(){
  for(let intento=0;intento<20;intento++){
    CUBO.resetLogic();
    for(let i=0;i<30;i++)gatillo();
    if(!resolverEsquinas())continue;
    for(let i=0,n=4+azar(4);i<n;i++)gatillo();
    if(esquinas().plan)return true;
  }
  return false;
}

// ================= Cruz blanca =================
// Receta de principiante, siempre igual: llevar la arista a la capa amarilla, girar esa capa hasta dejarla
// en la cara de su color y meterla con media vuelta. Las cuatro aristas, en el orden de girar():
const ARISTAS=['0,1,1','-1,1,0','0,1,-1','1,1,0'];
// Casos de una arista blanca:
//   cruzSacar    · está en la capa blanca pero mal puesta: media vuelta a su cara la lleva a la capa amarilla
//   cruzMedio    · está en la capa del medio: tres giros la llevan a la capa amarilla sin dañar la cruz
//   alinear      · está en la capa amarilla, pero no en la cara de su color
//   cruzSubir    · está en su cara con el blanco hacia afuera (cara amarilla): media vuelta y entra
//   cruzVolteada · está en su cara, pero el blanco mira a un costado: cuatro giros la meten bien orientada
function casoArista(id){
  const sts=CUBO.byId[id],p=sts[0].p,h=id.split(',').map(Number),k=ARISTAS.indexOf(id);
  if(p[1]===1)return {id,caso:'cruzSacar',plan:[{f:FACE_OF[key([p[0],0,p[2]])],n:2}],coste:4};
  if(p[1]===0)return {id,caso:'cruzMedio',plan:sec('cruzMedio',HUECOS.indexOf(key([p[0],1,p[2]]))),coste:3};
  if(p[0]!==h[0]||p[2]!==h[2]){
    let c=0;
    do{CUBO.quarter('D',1);c++;}while(c<4&&(CUBO.byId[id][0].p[0]!==h[0]||CUBO.byId[id][0].p[2]!==h[2]));
    for(let i=0;i<c;i++)CUBO.quarter('D',-1);
    return {id,caso:'alinear',plan:[{f:'D',n:c===3?-1:c}],coste:2};
  }
  const caso=sts.find(s=>s.hn[1]===1).n[1]===-1?'cruzSubir':'cruzVolteada';
  return {id,caso,plan:sec(caso,k),coste:caso==='cruzSubir'?0:1};
}
function cruz(actual){
  const faltan=ARISTAS.filter(id=>!CUBO.resuelta(id));
  if(!faltan.length)return {listo:true};
  if(actual&&faltan.includes(actual))return casoArista(actual);
  return faltan.map(casoArista).sort((a,b)=>a.coste-b.coste)[0];
}
// Ejercicio: cubo mezclado del todo, con al menos dos aristas blancas por colocar
function generarCruz(){
  for(let intento=0;intento<50;intento++){
    CUBO.resetLogic();
    aplicar(CUBO.genScramble(25));
    if(ARISTAS.filter(id=>!CUBO.resuelta(id)).length>=2)return true;
  }
  return false;
}

// Lecciones del Modo Práctica. paso(actual) dice qué pieza toca y con qué giros; generar() prepara un ejercicio.
const LECCIONES={
  cruz:{etapa:0,paso:cruz,generar:generarCruz},
  esquinas:{etapa:1,paso:esquinas,generar:generarEsquinas}
};

return {HUECOS,ARISTAS,LECCIONES,girar,aplicar,casoEsquina,esquinas,resolverEsquinas,generarEsquinas,casoArista,cruz,generarCruz};
})();
