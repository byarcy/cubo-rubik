/* algorithms.js · Dictionaries of sequences for the practice lessons.
   Each method keeps its cases as text in standard notation; CUBE.parseSeq turns them into turns.
   Example entry:
     ALGORITHMS.cfop.sune={name:'Sune',group:'OLL',seq:"R U R' U R U2 R'"};
   Exposes a single global object: ALGORITHMS. */
const ALGORITHMS={
  // Layer-by-layer method. The sequences are written with white on the U face and the corner slot
  // between the front and the right (U-R-F); the coach moves them to the other three slots.
  // groups: how the guides split a sequence to learn it (sizes, in turns); without it, one group
  layers:{
    // White cross: written for the white-green edge (slot U-F); crossMiddle, for the edge between F and R
    crossUp:{name:'White points outward',group:'White cross',seq:"F2"},
    crossFlipped:{name:'White points sideways',group:'White cross',seq:"D R F' R'",groups:[1,3]},
    crossMiddle:{name:'Edge in the middle layer',group:'White cross',seq:"R' D R"},
    cornerRight:{name:'White points sideways',group:'White corners',seq:"R' D' R"},
    cornerFront:{name:'White points the other way',group:'White corners',seq:"F D F'"},
    cornerOut:{name:'White points outward',group:'White corners',seq:"R' D2 R D R' D' R",groups:[3,4]},
    cornerTake:{name:'Corner in the wrong place',group:'White corners',seq:"R' D' R"},
    // Second layer: written for the slot between F and R. secondRight: the edge is under the F center (its side
    // color is F) and goes up to the right; secondLeft: it is under the R center (side color R) and goes up to the left
    secondRight:{name:'Edge goes up to the right',group:'Second layer',seq:"D' R' D R D F D' F'",groups:[4,4]},
    secondLeft:{name:'Edge goes up to the left',group:'Second layer',seq:"D F D' F' D' R' D R",groups:[4,4]},
    // Last layer. The guide turns the cube over (yellow on top) and writes them as F R U R' U' F', R U R' U R U2 R'
    // and U R U' L' U R' U' L; here they are in model faces (yellow = D), so U↔D and R↔L. The coach tries them
    // from the four sides (rotateToSlot), so the side they are written for doesn't matter.
    yellowCross:{name:'Yellow cross (flips two edges)',group:'Yellow cross',seq:"F L D L' D' F'",groups:[1,4,1]},
    yellowEdges:{name:'Swap yellow edges (Sune)',group:'Yellow edges',seq:"L D L' D L D2 L'",groups:[4,3]},
    yellowCorners:{name:'Cycle three yellow corners',group:'Yellow corners',seq:"D L D' R' D L' D' R",groups:[4,4]},
    // The guide's R' D' R D: done twice it turns the corner at the front-top-right (yellow on top) a third of a turn;
    // the rest of the cube looks messed up until the last corner is turned (6 repetitions in total put it back)
    yellowTwist:{name:'Turn the yellow corner in the working spot',group:'Yellow corners',seq:"L' U' L U"}
  },
  // CFOP for beginners: the last layer in two looks (OLL in two steps, PLL in two steps). Unlike the layer-by-layer
  // ones, these are written as the guides write them, with yellow on top (the cross at the bottom); the coach turns them
  // to model faces. Only face turns, so every one can be made by dragging a face on the screen.
  cfop:{
    // OLL, first look: the yellow cross (the dot needs both)
    ollLine:{name:'Line to cross',group:'OLL edges',seq:"F R U R' U' F'",groups:[1,4,1]},
    ollL:{name:'L to cross',group:'OLL edges',seq:"F U R U' R' F'",groups:[1,4,1]},
    // OLL, second look: the seven corner cases
    sune:{name:'Sune',group:'OLL corners',seq:"R U R' U R U2 R'",groups:[4,3]},
    antisune:{name:'Antisune',group:'OLL corners',seq:"R U2 R' U' R U' R'",groups:[3,4]},
    ollH:{name:'H',group:'OLL corners',seq:"R U R' U R U' R' U R U2 R'",groups:[4,3,4]},
    pi:{name:'Pi',group:'OLL corners',seq:"R U2 R2 U' R2 U' R2 U2 R",groups:[3,3,3]},
    headlights:{name:'Headlights',group:'OLL corners',seq:"R2 D R' U2 R D' R' U2 R'",groups:[4,5]},
    ollT:{name:'T',group:'OLL corners',seq:"L F R' F' L' F R F'",groups:[4,4]},
    bowtie:{name:'Bowtie',group:'OLL corners',seq:"R' F R B' R' F' R B",groups:[4,4]},
    // PLL, first look: the corners (two neighbors swapped, or two on a diagonal)
    tPerm:{name:'T perm',group:'PLL corners',seq:"R U R' U' R' F R2 U' R' U' R U R' F'",groups:[4,3,4,3]},
    yPerm:{name:'Y perm',group:'PLL corners',seq:"F R U' R' U' R U R' F' R U R' U' R' F R F'",groups:[1,4,4,4,4]},
    // PLL, second look: the edges (three around, or two pairs swapped)
    ua:{name:'U perm (a)',group:'PLL edges',seq:"R U' R U R U R U' R' U' R2",groups:[4,4,3]},
    ub:{name:'U perm (b)',group:'PLL edges',seq:"R2 U R U R' U' R' U' R' U R'",groups:[4,4,3]},
    hPerm:{name:'H perm',group:'PLL edges',seq:"R2 U2 R U2 R2 U2 R2 U2 R U2 R2",groups:[5,6]},
    zPerm:{name:'Z perm',group:'PLL edges',seq:"R' U' R U' R U R U' R' U R U R2 U' R' U2",groups:[4,4,4,3,1]}
  },
  roux:{},
  zz:{}
};
