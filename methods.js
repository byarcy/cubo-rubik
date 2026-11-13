/* methods.js · The solving methods as data: their stages, their lessons, their algorithms sheet and the pictures of
   their goals. The app builds the stage bar, the lesson picker, Help · Algorithms and the lesson pictures from here, so
   a new method is a new entry in ALL (plus its lessons in coach.js and its texts in locales/).
   Everything is in model faces (white = U, yellow = D). Uses CUBE (cube_logic.js). Exposes a single global: METHODS. */
const METHODS=(function(){
const {nz,piecesOf,pieceSolved,inPlace,facesHome}=CUBE;
// Ways of holding the cube for a picture, in model faces: which face is up, in front and to the right
const VIEW={white:{U:'U',F:'F',R:'R'},yellow:{U:'D',F:'F',R:'L'},front:{U:'F',F:'D',R:'R'}};

// ================= Layer by layer (the beginner method) =================
const layers={
  id:'layers',
  // In order; ok() says whether the stage is done (each one counts only if the ones before are). Name: "stage.<id>".
  stages:[
    {id:'cross',ok:()=>piecesOf(1,2).every(pieceSolved)},
    {id:'corners',ok:()=>piecesOf(1,3).every(pieceSolved)},
    {id:'secondLayer',ok:()=>piecesOf(0,2).every(pieceSolved)},
    {id:'yellowCross',ok:()=>piecesOf(-1,2).every(id=>CUBE.byId[id].some(k=>k.hn[1]===-1&&facesHome(k)))},
    {id:'yellowEdges',ok:()=>piecesOf(-1,2).every(pieceSolved)},
    {id:'yellowCornersPlace',ok:()=>piecesOf(-1,3).every(inPlace)},
    {id:'yellowCornersTurn',ok:()=>piecesOf(-1,3).every(pieceSolved)}
  ],
  // One lesson per stage, in the same order (their ids in COACH.LESSONS), and the other practices
  lessons:['cross','corners','secondLayer','yellowCross','yellowEdges','yellowCornersPlace','yellowCornersTurn'],
  more:['solve','repeat','recognize'],
  // Help · Algorithms, stage by stage: the algorithms of ALGORITHMS.layers, written the way the guide holds the cube
  // (yellowUp: turned over, so U↔D and R↔L); extra: turns the guide adds at the end; times: done that many times in a
  // row; keep: for the last layer, what its before → after picture shows (the rest is gray), that is, what it is for
  sheet:[
    {stage:0,algs:['crossUp','crossFlipped','crossMiddle']},
    {stage:1,algs:['cornerRight','cornerFront','cornerOut']},
    {stage:2,algs:['secondRight','secondLeft']},
    {stage:3,algs:['yellowCross'],yellowUp:true,keep:(k,top)=>top&&k.c==='D'&&nz(k.p)<3},          // the yellow shape
    // the guide adds a last turn of the top layer (U, model D) once the two neighbors are held at the back and right
    {stage:4,algs:['yellowEdges'],yellowUp:true,extra:[{f:'D',n:1}],keep:(k,top)=>nz(k.p)<3&&(!top||k.c==='D')},
    {stage:5,algs:['yellowCorners'],yellowUp:true,keep:(k,top)=>nz(k.p)!==2&&(!top||k.c==='D')},  // the corners
    {stage:6,algs:['yellowTwist'],yellowUp:true,times:2,keep:(k,top)=>!top||k.c==='D'}           // the whole layer
  ],
  // The picture of each lesson's goal, drawn from a solved cube: view, keep(sticker,onTop) (what is in color: what that
  // stage leaves done), and turns to do first; sign: a symbol instead of a picture
  pictures:{
    cross:{view:VIEW.white,keep:k=>nz(k.p)<3},
    corners:{view:VIEW.white,keep:()=>true},
    secondLayer:{view:VIEW.front,keep:k=>k.p[1]>=0},
    yellowCross:{view:VIEW.yellow,keep:(k,top)=>top&&k.c==='D'&&nz(k.p)<3},
    yellowEdges:{view:VIEW.yellow,keep:k=>nz(k.p)<3},
    // the corners in their place, one of them still turned
    yellowCornersPlace:{view:VIEW.yellow,keep:(k,top)=>!top||k.c==='D',turns:"L' U' L U L' U' L U"},
    yellowCornersTurn:{view:VIEW.yellow,keep:()=>true},
    solve:{view:VIEW.front,keep:()=>true},
    repeat:{sign:'↻'},
    recognize:{sign:'?'}
  }
};

// ================= CFOP for beginners =================
// Cross, the first two layers (F2L), and the last layer in two looks: OLL in two steps (the yellow cross, then the yellow
// face) and PLL in two steps (the corners, then the edges). Held as the guides hold it: the cross at the bottom, yellow
// on top. The cross and F2L have no recipe: the coach finds the shortest way (search.js).
const yellowUp=id=>CUBE.byId[id].some(k=>k.hn[1]===-1&&facesHome(k));
const cfop={
  id:'cfop',
  // its algorithms (ALGORITHMS.cfop) are written as the guides write them, with yellow on top
  guide:true,
  stages:[
    {id:'cross',ok:()=>piecesOf(1,2).every(pieceSolved)},
    {id:'f2l',ok:()=>piecesOf(1,3).every(pieceSolved)&&piecesOf(0,2).every(pieceSolved)},
    {id:'yellowCross',ok:()=>piecesOf(-1,2).every(yellowUp)},
    {id:'yellowFace',ok:()=>piecesOf(-1,3).every(yellowUp)},
    {id:'llCorners',ok:()=>piecesOf(-1,3).every(pieceSolved)},
    {id:'llEdges',ok:()=>piecesOf(-1,2).every(pieceSolved)}
  ],
  lessons:['cfopCross','f2l','ollEdges','ollCorners','pllCorners','pllEdges'],
  more:[],
  sheet:[
    {stage:2,algs:['ollLine','ollL'],yellowUp:true,keep:(k,top)=>top&&k.c==='D'&&nz(k.p)<3},
    // OLL diagrams show where every yellow sticker is, on top and on the sides
    {stage:3,algs:['sune','antisune','ollH','pi','headlights','ollT','bowtie'],yellowUp:true,keep:k=>k.c==='D'},
    {stage:4,algs:['tPerm','yPerm'],yellowUp:true,keep:()=>true},
    {stage:5,algs:['ua','ub','hPerm','zPerm'],yellowUp:true,keep:()=>true}
  ],
  pictures:{
    cfopCross:{view:VIEW.white,keep:k=>nz(k.p)<3},
    f2l:{view:VIEW.front,keep:k=>k.p[1]>=0},
    ollEdges:{view:VIEW.yellow,keep:(k,top)=>top&&k.c==='D'&&nz(k.p)<3},
    ollCorners:{view:VIEW.yellow,keep:(k,top)=>top&&k.c==='D'},
    pllCorners:{view:VIEW.yellow,keep:(k,top)=>top?k.c==='D':nz(k.p)===3},
    pllEdges:{view:VIEW.yellow,keep:()=>true}
  }
};

const ALL={layers,cfop};
const get=id=>ALL[id]||ALL[DEFAULT];
const DEFAULT='layers';
// How many consecutive stages of a method are done (0 to the number of stages). Stages are for the 3×3.
function stage(id=DEFAULT){
  if(CUBE.size!==3)return 0;
  const st=get(id).stages;let n=0;
  while(n<st.length&&st[n].ok())n++;
  return n;
}
return {ALL,DEFAULT,VIEW,get,stage};
})();
