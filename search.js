/* search.js · Finds short turn sequences for the intuitive steps, the ones no recipe covers: the CFOP cross and the F2L
   pairs. It only follows the pieces that matter (each one as a small number: where it is and how it is turned), knows
   for every face turn where each of those numbers goes, and keeps tables of distances: how many turns, at least, bring
   the cross (or a pair) home. With them the search only goes down paths that can still end in time (iterative
   deepening). The tables are built the first time they are needed, in a fraction of a second.
   Model faces (white = U): in CFOP the cross is white (U) and the free layer is yellow (D). Uses CUBE. Exposes SEARCH. */
const SEARCH=(function(){
const {key}=CUBE;
// The 18 face turns: 6 faces × (clockwise, counter-clockwise, half)
const FACES=['U','D','R','L','F','B'],TURN_LIST=[];
for(const f of FACES)for(const n of [1,-1,2])TURN_LIST.push({f,n});
const NT=TURN_LIST.length;
// A quarter turn of vector v about axis a (s > 0: one way, s < 0: the other), as in cube_logic.js
function rot(v,a,s){
  const b=(a+1)%3,c=(a+2)%3,w=[v[0],v[1],v[2]];
  if(s>0){w[b]=-v[c];w[c]=v[b];}else{w[b]=v[c];w[c]=-v[b];}
  return w;
}
const I3=[[1,0,0],[0,1,0],[0,0,1]];
const stateKey=(p,R)=>key(p)+'|'+key(R[0])+'|'+key(R[1])+'|'+key(R[2]);

// ---- One piece: every state it can reach (0 = solved) and, for each turn, where each state goes ----
const pieceCache={};
function piece(id){
  if(pieceCache[id])return pieceCache[id];
  const states=[{p:id.split(',').map(Number),R:I3}],index={[stateKey(states[0].p,I3)]:0},quarter={};
  for(const f of FACES)quarter[f]=[];
  for(let i=0;i<states.length;i++){
    const {p,R}=states[i];
    for(const f of FACES){
      const [a,l,s]=CUBE.MOVES[f];
      let np=p,nR=R;
      if(p[a]===l){np=rot(p,a,s);nR=R.map(c=>rot(c,a,s));}
      const k=stateKey(np,nR);
      if(!(k in index)){index[k]=states.length;states.push({p:np,R:nR});}
      quarter[f][i]=index[k];
    }
  }
  // the 18 turns from the quarter turns (counter-clockwise = three quarters, half = two)
  const n=states.length,next=new Int16Array(n*NT);
  TURN_LIST.forEach((t,m)=>{
    for(let i=0;i<n;i++){
      const q=x=>quarter[t.f][x];
      next[i*NT+m]=t.n===1?q(i):t.n===2?q(q(i)):q(q(q(i)));
    }
  });
  return pieceCache[id]={id,n,states,index,next};
}
// The state number of a piece in the real cube now
function stateOf(id){const pc=piece(id),fr=CUBE.frameOf(id);return pc.index[stateKey(fr.p,fr.R)];}

// ---- Distance tables: for a group of pieces, how many turns (with these turns) bring all of them home ----
// The group is encoded as one number (each piece in base «its number of states»). Built by a breadth-first walk.
function distTable(ids,turns){
  const P=ids.map(piece),size=P.reduce((a,p)=>a*p.n,1),dist=new Int8Array(size).fill(-1);
  const encode=st=>st.reduce((a,v,i)=>a*P[i].n+v,0);
  const decode=x=>{const st=new Array(P.length);for(let i=P.length-1;i>=0;i--){st[i]=x%P[i].n;x=Math.floor(x/P[i].n);}return st;};
  let frontier=[0];dist[0]=0;
  for(let d=0;frontier.length;d++){
    const nextF=[];
    for(const x of frontier){
      const st=decode(x);
      for(const m of turns){
        const y=encode(st.map((v,i)=>P[i].next[v*NT+m]));
        if(dist[y]<0){dist[y]=d+1;nextF.push(y);}
      }
    }
    frontier=nextF;
  }
  return {ids,P,dist,encode};
}
const ALL_TURNS=TURN_LIST.map((t,i)=>i);
// In F2L the cross face (white, U) is not turned: only the yellow layer and the four sides
const F2L_TURNS=TURN_LIST.map((t,i)=>i).filter(i=>TURN_LIST[i].f!=='U');
const tables={};
const table=(name,ids,turns)=>tables[name]||(tables[name]=distTable(ids,turns));
const CROSS=['0,1,1','-1,1,0','0,1,-1','1,1,0'];
const crossTable=()=>table('cross',CROSS,ALL_TURNS);
// The four F2L slots: a white corner and the middle edge under it
const PAIRS=['1,1,1','-1,1,1','-1,1,-1','1,1,-1'].map(c=>{const p=c.split(',');return [c,p[0]+',0,'+p[2]];});
const pairTable=k=>table('pair'+k,PAIRS[k],F2L_TURNS);

// Two turns in a row on the same face are one turn; opposite faces are tried in one order only
const OPP={U:'D',D:'U',R:'L',L:'R',F:'B',B:'F'};
const allowedAfter=(last,f)=>last==null||(f!==last&&!(OPP[f]===last&&'DLB'.includes(f)));

// ---- The cross: the table is exact, so the shortest ways are found by always taking a turn that brings it closer ----
// Returns the shortest routes (each a list of turns), one per first turn that starts one, or [] if it is done
function crossRoutes(){
  const T=crossTable();
  let st=CROSS.map(stateOf);
  const dist=s=>T.dist[T.encode(s)];
  const d0=dist(st);
  if(d0<=0)return [];
  const routes=[];
  for(const m of ALL_TURNS){
    const s1=st.map((v,i)=>T.P[i].next[v*NT+m]);
    if(dist(s1)!==d0-1)continue;
    const route=[m];let s=s1;
    while(dist(s)>0){
      const last=TURN_LIST[route[route.length-1]].f;
      const mm=ALL_TURNS.find(x=>TURN_LIST[x].f!==last&&dist(s.map((v,i)=>T.P[i].next[v*NT+x]))===dist(s)-1);
      route.push(mm);s=s.map((v,i)=>T.P[i].next[v*NT+mm]);
    }
    routes.push(route.map(x=>({...TURN_LIST[x]})));
  }
  return routes;
}
const crossDistance=()=>{const T=crossTable();return T.dist[T.encode(CROSS.map(stateOf))];};

// ---- F2L: the shortest way to put one more pair in, keeping the cross and the pairs already in ----
// Iterative deepening over the cross, the pairs already in and the one being placed; a path is dropped as soon as the
// tables say it can't end in the turns left. Returns {slot, route} for the pair with the shortest route, or null.
function f2lNext(maxDepth=14){
  const C=crossTable(),done=[],todo=[];
  PAIRS.forEach((pr,k)=>(pr.every(id=>stateOf(id)===0)?done:todo).push(k));
  if(!todo.length)return null;
  let best=null;
  for(const k of todo){
    const tabs=[pairTable(k),...done.map(pairTable)];
    const crossSt=CROSS.map(stateOf),pairSt=tabs.map(t=>t.ids.map(stateOf));
    const h=(cs,ps)=>{let v=C.dist[C.encode(cs)];for(let i=0;i<tabs.length;i++){const d=tabs[i].dist[tabs[i].encode(ps[i])];if(d>v)v=d;}return v;};
    const path=[];
    const dfs=(cs,ps,g,bound,last)=>{
      const hv=h(cs,ps);
      if(hv===0)return true;
      if(g+hv>bound)return false;
      for(const m of F2L_TURNS){
        const f=TURN_LIST[m].f;
        if(!allowedAfter(last,f))continue;
        const cs2=cs.map((v,i)=>C.P[i].next[v*NT+m]);
        const ps2=ps.map((pp,j)=>pp.map((v,i)=>tabs[j].P[i].next[v*NT+m]));
        path.push(m);
        if(dfs(cs2,ps2,g+1,bound,f))return true;
        path.pop();
      }
      return false;
    };
    const limit=best?best.route.length-1:maxDepth;
    for(let bound=h(crossSt,pairSt);bound<=limit;bound++){
      if(dfs(crossSt,pairSt,0,bound,null)){best={slot:k,route:path.map(x=>({...TURN_LIST[x]}))};break;}
    }
  }
  return best;
}

return {crossRoutes,crossDistance,f2lNext,PAIRS,CROSS,piece,stateOf};
})();
