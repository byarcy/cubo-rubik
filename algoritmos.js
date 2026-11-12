/* algoritmos.js · Diccionarios de secuencias para los modos de práctica.
   Cada método guarda sus casos como texto en notación estándar; CUBO.parseSeq los convierte en giros.
   Ejemplo de entrada:
     ALGORITMOS.cfop.sune={nombre:'Sune',grupo:'OLL',sec:"R U R' U R U2 R'"};
   Expone un único objeto global: ALGORITMOS. */
const ALGORITMOS={
  // Método por capas. Las secuencias están escritas con el blanco en la cara U y el hueco de la esquina
  // entre el frente y la derecha (U-R-F); el entrenador las traslada a los otros tres huecos.
  capas:{
    // Cruz blanca: escritas para la arista blanco-verde (hueco U-F); cruzMedio, para la arista entre F y R
    cruzSubir:{nombre:'El blanco mira hacia afuera',grupo:'Cruz blanca',sec:"F2"},
    cruzVolteada:{nombre:'El blanco mira a un costado',grupo:'Cruz blanca',sec:"D R F' R'"},
    cruzMedio:{nombre:'Arista en la capa del medio',grupo:'Cruz blanca',sec:"R' D R"},
    esqDer:{nombre:'El blanco mira a un costado',grupo:'Esquinas blancas',sec:"R' D' R"},
    esqFrente:{nombre:'El blanco mira al otro costado',grupo:'Esquinas blancas',sec:"F D F'"},
    esqFuera:{nombre:'El blanco mira hacia afuera',grupo:'Esquinas blancas',sec:"R' D2 R D R' D' R"},
    esqSacar:{nombre:'Esquina mal puesta',grupo:'Esquinas blancas',sec:"R' D' R"}
  },
  cfop:{},
  roux:{},
  zz:{}
};
