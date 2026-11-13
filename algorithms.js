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
    secondLeft:{name:'Edge goes up to the left',group:'Second layer',seq:"D F D' F' D' R' D R"}
  },
  cfop:{},
  roux:{},
  zz:{}
};
