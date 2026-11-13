/* pruebas/lecciones.test.js · Comprueba, sin navegador, todas las lecciones registradas en ENTRENADOR.LECCIONES.
   Uso (desde la carpeta del proyecto):   node pruebas/lecciones.test.js
   Al agregar una lección nueva no hay que tocar este archivo: recorre solas todas las que existan.

   Por cada lección, 300 ejercicios resueltos de punta a punta, eligiendo al azar entre el plan principal y las rutas
   equivalentes (alt) de cada paso. Se exige que:
     · el ejercicio generado esté en la etapa anterior a la lección y la lección tenga algo que hacer;
     · cada paso (principal o alterno) deje el cubo sin sacar de su sitio ninguna pieza de la lección ya colocada;
     · la lección termine (nunca se queda en bucle, ni dice «roto»);
     · al terminar, la etapa de la lección esté completa. */
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..');
const src=['logica_cubo.js','algoritmos.js','entrenador.js'].map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
const {CUBO,ENTRENADOR}=new Function(src+';return {CUBO,ENTRENADOR};')();
const azar=n=>Math.floor(Math.random()*n);
const N=300,MAX_PASOS=80;
let errores=0;
const falla=(lec,msg)=>{errores++;if(errores<=15)console.log('  ✗ ['+lec+'] '+msg);};

for(const nombre of Object.keys(ENTRENADOR.LECCIONES)){
  const L=ENTRENADOR.LECCIONES[nombre];
  const stats={pasos:0,conAlt:0,usoAlt:0,casos:{}};
  for(let i=0;i<N;i++){
    if(!L.generar()){falla(nombre,'no pudo generar un ejercicio');continue;}
    if(CUBO.etapa()!==L.etapa)falla(nombre,'el ejercicio empieza en la etapa '+CUBO.etapa()+' y debía ser la '+L.etapa);
    if(!L.paso().plan)falla(nombre,'el ejercicio generado ya está resuelto');
    let actual=null,n=0;
    for(;;){
      const e=L.paso(actual);
      if(e.roto){falla(nombre,'dice «roto» en un ejercicio que siguió los pasos');break;}
      if(e.listo)break;
      if(!e.plan||!e.plan.length){falla(nombre,'paso sin giros: '+JSON.stringify(e));break;}
      if(++n>MAX_PASOS){falla(nombre,'no termina en '+MAX_PASOS+' pasos');break;}
      stats.pasos++;stats.casos[e.caso]=(stats.casos[e.caso]||0)+1;
      const rutas=[e.plan,...(e.alt||[])];
      if(e.alt&&e.alt.length)stats.conAlt++;
      // cada ruta, por separado, debe cumplir el invariante desde este mismo cubo
      const foto=CUBO.snapshot(),antes=L.piezas().filter(CUBO.resuelta);
      rutas.forEach((r,k)=>{
        ENTRENADOR.aplicar(r);
        for(const id of antes)if(!CUBO.resuelta(id)){falla(nombre,(k?'ruta alterna':'plan')+' del caso «'+e.caso+'» saca de su sitio la pieza '+id+': '+CUBO.seqText(r));break;}
        CUBO.applySnap(foto);
      });
      const k=azar(rutas.length);if(k>0)stats.usoAlt++;
      ENTRENADOR.aplicar(rutas[k]);actual=e.id;
    }
    if(CUBO.etapa()<=L.etapa)falla(nombre,'al terminar, la etapa '+(L.etapa+1)+' no quedó completa');
  }
  console.log((errores?'✗':'✓')+' '+nombre+': '+N+' ejercicios, '+(stats.pasos/N).toFixed(1)+' pasos cada uno; pasos con rutas alternas: '+stats.conAlt+', alternas usadas: '+stats.usoAlt+'; casos '+JSON.stringify(stats.casos));
}
console.log(errores?'\n'+errores+' errores':'\nTodo en orden');
process.exit(errores?1:0);
