/* tests/cube.test.js · Checks, without a browser, the cube logic (cube_logic.js) on its own.
   Usage (from the project folder):   node tests/cube.test.js
   It checks facts that any real cube obeys, so a change in the logic that breaks them shows up here first:
     · each face turned 4 times, a turn and its inverse, and a half turn twice give back the same cube;
     · known sequences come back after their known number of repetitions (R U R' U' after 6, R U after 105…);
     · any sequence followed by its inverse gives back the solved cube; text ↔ turns gives back the same text;
     · a half turn is the same as two quarter turns;
     · the notation reads guides and websites (brackets, no spaces, ’, R2') and every turn of the table: middle layers
       (M E S), two layers (r or Rw…) and the whole cube (x y z), each one equal to its face turns;
     · "solved" and "in place" are measured against the centers (a turned cube is still solved; on the 2×2, one corner);
     · trying turns with withSnapshot always leaves the cube as it was, even if something fails in the middle;
     · every scrambled cube is a valid snapshot, and a cube that can't exist is refused (and loads solved), both in
       today's format (one rotation per piece, centers with their spin) and in the saves made up to v0.41 (stickers);
     · the stages of the layer-by-layer method see what a single turn breaks. */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','cube_logic.js'),'utf8');
const {CUBE}=new Function(src+';return {CUBE};')();
let errors=0,checks=0;
const ok=(cond,msg)=>{checks++;if(!cond){errors++;if(errors<=20)console.log('  ✗ '+msg);}};
const P=CUBE.parseSeq,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const FACES='UDFBRL'.split('');
const solvedSnap=()=>{CUBE.resetLogic();return CUBE.snapshot();};
const SOLVED=solvedSnap();
// the cube after a sequence, from solved
const after=seq=>{CUBE.resetLogic();CUBE.apply(typeof seq==='string'?P(seq):seq);return CUBE.snapshot();};
// how many repetitions of a sequence bring the solved cube back
function order(txt){CUBE.resetLogic();const s=P(txt);let n=0;do{CUBE.apply(s);n++;}while(!CUBE.isSolved()&&n<2000);return n;}

// ---- Start ----
// the logic starts with a whole solved cube (the app draws pictures with withSnapshot before loading anything)
ok(CUBE.cube.length===54&&CUBE.isSolved(),'the cube does not start whole and solved');
ok(CUBE.withSnapshot(()=>{CUBE.resetLogic();CUBE.apply(P('R'));return true;})&&CUBE.isSolved(),'trying turns on the starting cube does not leave it solved');

// ---- Turns ----
for(const f of FACES){
  ok(same(after(f+' '+f+' '+f+' '+f),SOLVED),f+' four times is not the solved cube');
  ok(same(after(f+' '+f+"'"),SOLVED),f+' and '+f+"' don't cancel out");
  ok(same(after(f+'2 '+f+'2'),SOLVED),f+'2 twice is not the solved cube');
  ok(same(after(f+'2'),after(f+' '+f)),f+'2 is not '+f+' '+f);
  ok(same(after(f+"'"),after(f+' '+f+' '+f)),f+"' is not three times "+f);
  CUBE.resetLogic();CUBE.move({f,n:1});ok(!CUBE.isSolved(),'after '+f+' the cube still says it is solved');
}
for(const [txt,n] of [["R U R' U'",6],['R U',105],['R2 U2',6],["F L D L' D' F'",6],["L D L' D L D2 L'",6],["D L D' R' D L' D' R",3]])
  ok(order(txt)===n,'«'+txt+'» comes back after '+order(txt)+' repetitions, not '+n);
// opposite faces don't touch each other
ok(same(after('R L'),after('L R')),'R L is not L R');
ok(same(after('U D2'),after('D2 U')),'U D2 is not D2 U');

// ---- Notation ----
for(let i=0;i<300;i++){
  const s=CUBE.genScramble(25),txt=CUBE.seqText(s);
  ok(same(CUBE.seqText(P(txt)),txt),'text → turns → text changes: '+txt);
  ok(same(after([...s,...CUBE.invSeq(s)]),SOLVED),'a scramble and its inverse are not the solved cube: '+txt);
  ok(s.every(CUBE.isMove),'the scramble has an invalid turn: '+txt);
}
for(const bad of ['X','R3',"R''",'w','R2 Q','Uw3',"M'''","R'3",'Ww'])ok((()=>{try{P(bad);return false;}catch(e){return true;}})(),'«'+bad+'» is read as a turn');
CUBE.size=2;ok(CUBE.genScramble(40).every(m=>'RUF'.includes(m.f)),'the 2×2 scramble uses faces other than R, U and F');CUBE.size=3;

// the notation as guides and websites write it
const reads=(txt,want)=>ok((()=>{try{return CUBE.seqText(P(txt))===want;}catch(e){return false;}})(),'«'+txt+'» is not read as «'+want+'»');
reads("(R U R' U')","R U R' U'");
reads("RUR'U'","R U R' U'");
reads("R U R’ U’","R U R' U'");
reads("R2' U'2 F2","R2 U2 F2");
reads("M' U M U2 M' U M","M' U M U2 M' U M");
reads("Rw U Rw' r U2 r'","Rw U Rw' r U2 r'");
reads("x2 y' z","x2 y' z");
reads("[R U] [R' U']","R U R' U'");
for(let i=0;i<200;i++){
  const names=Object.keys(CUBE.TURNS),s=Array.from({length:12},()=>({f:names[Math.floor(Math.random()*names.length)],n:[1,-1,2][Math.floor(Math.random()*3)]}));
  const txt=CUBE.seqText(s);
  ok(same(CUBE.seqText(P(txt)),txt),'text → turns → text changes: '+txt);
  ok(same(after([...s,...CUBE.invSeq(s)]),SOLVED),'a sequence with every kind of turn and its inverse are not the solved cube: '+txt);
  ok(s.every(CUBE.isMove),'a turn of the table is not a valid turn: '+txt);
}

// ---- Middle layers, two layers and the whole cube ----
// each one is the same as face turns plus a turn of the whole cube (spins of the centers included)
for(const [a,b] of [["M","R L' x'"],["E","U D' y'"],["S","F' B z"],["r","R M'"],["Rw","R M'"],["l","L M"],["u","U E'"],["d","D E"],
  ["f","F S"],["b","B S'"],["x","R M' L'"],["y","U E' D'"],["z","F S B'"],["r2","R2 M2"],["x'","r' L"]])
  ok(same(after(a),after(b)),a+' is not the same as '+b);
for(const f of ['M','E','S','r','u','x','y','z']){
  ok(same(after(f+' '+f+' '+f+' '+f),SOLVED),f+' four times is not the solved cube');
  ok(same(after(f+"2 "+f+"2"),SOLVED),f+'2 twice is not the solved cube');
}
// last-layer algorithms with middle layers: the U permutation and the H permutation
ok(order("M2 U M U2 M' U M2")===3,"M2 U M U2 M' U M2 should come back after 3 repetitions, not "+order("M2 U M U2 M' U M2"));
ok(order("M2 U M2 U2 M2 U M2")===2,"M2 U M2 U2 M2 U M2 should come back after 2 repetitions, not "+order("M2 U M2 U2 M2 U M2"));
// "solved" and "in place" are measured against the centers: a turned cube is still solved
for(const txt of ['x','y','z',"x y2 z'","M M' x2"]){
  after(txt);
  ok(CUBE.isSolved(),'after «'+txt+'» the cube is no longer solved');
  ok(CUBE.stage()===7,'after «'+txt+'» the stages are not all done (stage '+CUBE.stage()+')');
  ok(Object.keys(CUBE.byId).every(CUBE.pieceSolved)&&Object.keys(CUBE.byId).every(CUBE.inPlace),'after «'+txt+'» some piece is not in place');
}
for(const txt of ['M','E','S','r',"M2 U M U2 M' U"]){after(txt);ok(!CUBE.isSolved(),'after «'+txt+'» the cube says it is solved');}
// a yellow-cross case seen from another side: the same stage, with the cube turned over (x2) or around (y)
{
  const st=CUBE.withSnapshot(()=>{CUBE.resetLogic();CUBE.apply(P("F L D L' D' F'"));return CUBE.stage();});
  for(const w of ['y','x2','z2 y']){
    CUBE.resetLogic();CUBE.apply(P("F L D L' D' F' "+w));
    ok(CUBE.stage()===st,'turning the whole cube («'+w+'») changes the stage: '+CUBE.stage()+' instead of '+st);
  }
}
// cubes reached with every kind of turn are valid, and the rules hold
for(let i=0;i<500;i++){
  const names=Object.keys(CUBE.TURNS),s=Array.from({length:30},()=>({f:names[Math.floor(Math.random()*names.length)],n:[1,-1,2][Math.floor(Math.random()*3)]}));
  after(s);ok(CUBE.validSnap(CUBE.snapshot()),'a cube reached with «'+CUBE.seqText(s)+'» is not a valid snapshot');
}
{
  // a single M quarter turn swaps 4 edges and 4 centers: fine; moving only the centers is not
  after('M');const s=CUBE.snapshot();ok(CUBE.validSnap(s),'the cube after M is not valid');
  const centersOnly=SOLVED.map((e,i)=>e.slice());
  CUBE.resetLogic();
  const ids=CUBE.cube.map(k=>k.id).filter((v,i,a)=>a.indexOf(v)===i);
  for(const id of ['0,1,0','0,0,1','0,-1,0','0,0,-1'])centersOnly[ids.indexOf(id)]=s[ids.indexOf(id)];
  ok(!CUBE.validSnap(centersOnly),'the centers turned alone (as M, without its edges) are accepted');
}
// the 2×2: no centers, so "solved" and "in place" are measured against one corner
CUBE.size=2;
for(const txt of ["R L'","U D'","F B'","x y"]){
  after(txt);ok(CUBE.isSolved(),'2×2: after «'+txt+'» (a turn of the whole cube) it is not solved');
  ok(['1,1,1','-1,1,1','1,-1,1','1,1,-1'].every(CUBE.pieceSolved),'2×2: after «'+txt+'» the corners are not in place');
}
after('R');ok(!CUBE.isSolved(),'2×2: after R it says it is solved');
CUBE.size=3;

// ---- Trying turns without touching the real cube ----
CUBE.resetLogic();CUBE.apply(P("R U F'"));
{
  const before=CUBE.snapshot();
  const r=CUBE.withSnapshot(()=>{CUBE.apply(P('L D B2'));return 42;});
  ok(r===42,'withSnapshot does not give back what the function returns');
  ok(same(CUBE.snapshot(),before),'withSnapshot does not leave the cube as it was');
  try{CUBE.withSnapshot(()=>{CUBE.apply(P('L D B2'));throw new Error('test');});}catch(e){}
  ok(same(CUBE.snapshot(),before),'withSnapshot does not leave the cube as it was when the function fails');
  CUBE.withSnapshot(()=>CUBE.resetLogic());
  ok(same(CUBE.snapshot(),before),'withSnapshot does not undo a reset made inside it');
}

// ---- Snapshots: one rotation per piece (26 entries of 9 numbers) ----
const stickers=()=>CUBE.cube.map(k=>[...k.p,...k.n]);   // what the stickers look like (and the save format up to v0.41)
CUBE.resetLogic();
ok(SOLVED.length===26&&SOLVED.every(e=>e.length===9),'a snapshot is not 26 pieces of 9 numbers');
for(let i=0;i<1000;i++){
  CUBE.resetLogic();CUBE.apply(CUBE.genScramble(30));const s=CUBE.snapshot(),look=stickers();
  ok(CUBE.validSnap(s),'a scrambled cube is not a valid snapshot');
  ok(CUBE.applySnap(s)&&same(CUBE.snapshot(),s)&&same(stickers(),look),'a valid snapshot does not load as it is');
  // the same cube saved the old way (one entry per sticker) loads with the same stickers
  ok(CUBE.applySnap(look)&&same(stickers(),look),'an old save does not load as the same cube');
}
ok(CUBE.applySnap(null)&&CUBE.isSolved(),'no snapshot (null) does not give a solved cube');
// the centers keep their spin: after U the white center is turned (and the cube looks the same on that center)
CUBE.resetLogic();CUBE.apply(P('U'));
ok(!same(CUBE.frameOf('0,1,0').R,[[1,0,0],[0,1,0],[0,0,1]]),'turning U does not spin the white center');
ok(same(CUBE.frameOf('0,1,0').p,[0,1,0]),'turning U moves the white center');
CUBE.apply(P("U'"));ok(same(CUBE.snapshot(),SOLVED),"U and U' don't give back the same snapshot, spins included");
// a piece's rotation, written as its three columns
const ROT={
  id:[[1,0,0],[0,1,0],[0,0,1]],
  cornerTwist:[[0,1,0],[0,0,1],[1,0,0]],        // a third of a turn about the corner's diagonal: same spot, twisted
  edgeFlip:[[-1,0,0],[0,0,1],[0,1,0]],          // half a turn about the edge's middle: same spot, flipped
  centerSpin:[[0,0,-1],[0,1,0],[1,0,0]],        // a quarter turn about y: the white center spun in its place
  upsideDown:[[1,0,0],[0,-1,0],[0,0,-1]],       // takes the white center to the bottom
  mirror:[[-1,0,0],[0,1,0],[0,0,1]]             // not a turn: a mirror image
};
const idx=id=>CUBE.cube.map(k=>k.id).filter((v,i,a)=>a.indexOf(v)===i).indexOf(id);
const withRot=(id,R)=>{const s=SOLVED.map(e=>e.slice());s[idx(id)]=[...R[0],...R[1],...R[2]];return s;};
function refused(name,s){
  ok(!CUBE.validSnap(s),name+': it is accepted');
  ok(!CUBE.applySnap(s)&&CUBE.isSolved(),name+': it does not load as a solved cube');
}
ok(CUBE.validSnap(withRot('0,1,0',ROT.centerSpin)),'a spun center is refused');
ok(CUBE.applySnap(withRot('0,1,0',ROT.centerSpin))&&CUBE.isSolved(),'a spun center is not a solved cube');
refused('one corner twisted',withRot('1,1,1',ROT.cornerTwist));
refused('one edge flipped',withRot('0,1,1',ROT.edgeFlip));
refused('a center moved',withRot('0,1,0',ROT.upsideDown));
refused('a mirrored piece',withRot('1,1,1',ROT.mirror));
// the corner of (1,1,-1), turned a quarter about y, lands on (1,1,1), where that corner still is
refused('two pieces in the same spot',withRot('1,1,-1',[[0,0,1],[0,1,0],[-1,0,0]]));
refused('a value that is not -1, 0 or 1',(()=>{const s=SOLVED.map(e=>e.slice());s[0][0]=2;return s;})());
refused('a missing piece',SOLVED.slice(1));
for(const junk of [{},'x',[1,2,3],[[0,0,0,0,0,0]],[[1,0,0,0,1,0,0,0,1]]])ok(!CUBE.validSnap(junk),'junk is accepted: '+JSON.stringify(junk).slice(0,30));

// ---- Saves up to v0.41: one entry per sticker [p, n] ----
CUBE.resetLogic();
const OLD=stickers();
const at=id=>CUBE.cube.map((k,i)=>k.id===id?i:-1).filter(i=>i>=0);
const copy=s=>s.map(e=>e.slice());
function refusedOld(name,change){const s=copy(OLD);change(s);refused('old save, '+name,s);}
// moves the whole piece «id» to spot «to», with these directions for its stickers
const putPiece=(s,id,to,dirs)=>at(id).forEach((i,j)=>{s[i]=[...to,...dirs[j]];});
refusedOld('one corner twisted',s=>{const c=at('1,1,1'),n=c.map(i=>s[i].slice(3));c.forEach((i,j)=>{s[i]=[...s[i].slice(0,3),...n[(j+1)%3]];});});
refusedOld('one edge flipped',s=>{const e=at('0,1,1'),n=e.map(i=>s[i].slice(3));e.forEach((i,j)=>{s[i]=[...s[i].slice(0,3),...n[1-j]];});});
refusedOld('two edges swapped',s=>{
  // the white-green edge (0,1,1) and the white-red one (1,1,0) trade places, white still on top
  putPiece(s,'0,1,1',[1,1,0],at('0,1,1').map(i=>OLD[i][4]?[0,1,0]:[1,0,0]));
  putPiece(s,'1,1,0',[0,1,1],at('1,1,0').map(i=>OLD[i][4]?[0,1,0]:[0,0,1]));
});
refusedOld('two pieces in the same spot',s=>{const e=at('0,1,1');putPiece(s,'1,1,0',[0,1,1],at('1,1,0').map((i,j)=>s[e[j]].slice(3)));});
refusedOld('a sticker away from its piece',s=>{const c=at('1,1,1');s[c[0]]=[1,1,-1,...s[c[0]].slice(3)];});
refusedOld('a corner seen in a mirror',s=>{const c=at('1,1,1'),n=c.map(i=>s[i].slice(3));s[c[0]]=[...s[c[0]].slice(0,3),...n[1]];s[c[1]]=[...s[c[1]].slice(0,3),...n[0]];});
refusedOld('a sticker facing inward',s=>{const i=at('1,1,1')[0];s[i]=[...s[i].slice(0,3),...s[i].slice(3).map(v=>-v)];});
refusedOld('a center moved',s=>{const i=at('0,1,0')[0];s[i]=[0,-1,0,0,-1,0];});
refusedOld('a value that is not -1, 0 or 1',s=>{s[0][0]=2;});
refusedOld('a missing sticker',s=>{s.pop();});

// ---- Stages of the layer-by-layer method (white = U, yellow = D) ----
ok(CUBE.stage()===7||(CUBE.resetLogic(),CUBE.stage()===7),'the solved cube is not at stage 7');
CUBE.resetLogic();CUBE.apply(P('U'));ok(CUBE.stage()===0,'turning the white face should break the white cross (stage '+CUBE.stage()+')');
CUBE.resetLogic();CUBE.apply(P('D'));ok(CUBE.stage()===4,'turning the yellow face should only undo the yellow edges (stage '+CUBE.stage()+')');
CUBE.resetLogic();CUBE.apply(P('R'));ok(CUBE.stage()===0,'turning a side breaks the white cross (stage '+CUBE.stage()+')');

console.log((errors?'✗':'✓')+' cube logic: '+checks+' checks');
console.log(errors?'\n'+errors+' errors':'\nAll good');
process.exit(errors?1:0);
