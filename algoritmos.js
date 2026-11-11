/* algoritmos.js · Diccionarios de secuencias para los modos de práctica.
   Cada método guarda sus casos como texto en notación estándar; CUBO.parseSeq los convierte en giros.
   Ejemplo de entrada:
     ALGORITMOS.cfop.sune={nombre:'Sune',grupo:'OLL',sec:"R U R' U R U2 R'"};
   Expone un único objeto global: ALGORITMOS. */
const ALGORITMOS={
  // Método por capas. Las secuencias están escritas con el blanco en la cara U y el hueco de la esquina
  // entre el frente y la derecha (U-R-F); el entrenador las traslada a los otros tres huecos.
  capas:{
    esqDer:{nombre:'El blanco mira a un costado',grupo:'Esquinas blancas',sec:"R' D' R"},
    esqFrente:{nombre:'El blanco mira al otro costado',grupo:'Esquinas blancas',sec:"F D F'"},
    esqFuera:{nombre:'El blanco mira hacia afuera',grupo:'Esquinas blancas',sec:"R' D2 R D R' D' R"},
    esqSacar:{nombre:'Esquina mal puesta',grupo:'Esquinas blancas',sec:"R' D' R"}
  },
  cfop:{},
  roux:{},
  zz:{}
};
