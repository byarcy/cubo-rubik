/* algorithms.js · Dictionaries of sequences for the practice lessons.
   Each method keeps its cases as text in standard notation; CUBE.parseSeq turns them into turns.
   Example entry:
     ALGORITHMS.cfop.sune={name:'Sune',group:'OLL',seq:"R U R' U R U2 R'"};
   Exposes a single global object: ALGORITHMS. */
const ALGORITHMS={
  // Layer-by-layer method. The sequences are written with white on the U face and the corner slot
  // between the front and the right (U-R-F); the coach moves them to the other three slots.
  layers:{
    // White cross: written for the white-green edge (slot U-F); crossMiddle, for the edge between F and R
    crossUp:{name:'White points outward',group:'White cross',seq:"F2"},
    crossFlipped:{name:'White points sideways',group:'White cross',seq:"D R F' R'"},
    crossMiddle:{name:'Edge in the middle layer',group:'White cross',seq:"R' D R"},
    cornerRight:{name:'White points sideways',group:'White corners',seq:"R' D' R"},
    cornerFront:{name:'White points the other way',group:'White corners',seq:"F D F'"},
    cornerOut:{name:'White points outward',group:'White corners',seq:"R' D2 R D R' D' R"},
    cornerTake:{name:'Corner in the wrong place',group:'White corners',seq:"R' D' R"},
    // Second layer: written for the slot between F and R. secondRight: the edge is under the F center (its side
    // color is F) and goes up to the right; secondLeft: it is under the R center (side color R) and goes up to the left
    secondRight:{name:'Edge goes up to the right',group:'Second layer',seq:"D' R' D R D F D' F'"},
    secondLeft:{name:'Edge goes up to the left',group:'Second layer',seq:"D F D' F' D' R' D R"},
    // Last layer. The guide turns the cube over (yellow on top) and writes them as F R U R' U' F', R U R' U R U2 R'
    // and U R U' L' U R' U' L; here they are in model faces (yellow = D), so U↔D and R↔L. The coach tries them
    // from the four sides (rotateToSlot), so the side they are written for doesn't matter.
    yellowCross:{name:'Yellow cross (flips two edges)',group:'Yellow cross',seq:"F L D L' D' F'"},
    yellowEdges:{name:'Swap yellow edges (Sune)',group:'Yellow edges',seq:"L D L' D L D2 L'"},
    yellowCorners:{name:'Cycle three yellow corners',group:'Yellow corners',seq:"D L D' R' D L' D' R"},
    // The guide's R' D' R D: done twice it turns the corner at the front-top-right (yellow on top) a third of a turn;
    // the rest of the cube looks messed up until the last corner is turned (6 repetitions in total put it back)
    yellowTwist:{name:'Turn the yellow corner in the working spot',group:'Yellow corners',seq:"L' U' L U"}
  },
  cfop:{},
  roux:{},
  zz:{}
};
