// Coordenada Geográfica ou Plana (UTM)
export interface CoordenadaUTM {
  vertice: string; // Ex: "P-01", "V-01"
  esteX: number;   // E (Longitude / X) em metros
  norteY: number;  // N (Latitude / Y) em metros
  cotaZ?: number;  // Altitude/Cota opcional
}

// Direção por Rumo ou Azimute
export interface Rumo {
  graus: number;
  minutos: number;
  segundos: number;
  quadrante?: 'NE' | 'SE' | 'SW' | 'NW'; // Ex: "45° 30' 12" NE"
}

// --- Os 3 Modelos Principais ---

// Modelo 1: Coordenadas e Medidas (Geralmente descrições UTM modernas/SIGEF)
export interface ModeloCoordenadasEMedidas {
  tipo: 'COORDENADAS_E_MEDIDAS';
  verticeOrigem: string;
  verticeDestino: string;
  coordenadaOrigem: CoordenadaUTM;
  coordenadaDestino: CoordenadaUTM;
  distanciaMetros: number;
}

// Modelo 2: Rumo e Distância (Muito comum em matrículas tradicionais)
export interface ModeloRumoEDistancia {
  tipo: 'RUMO_E_DISTANCIA';
  verticeOrigem?: string;
  verticeDestino?: string;
  rumo?: Rumo;
  azimuteDecimal?: number; // Ex: 135.5033° (alternativa ou conversão do Rumo)
  distanciaMetros: number;
}

// Modelo 3: Apenas Distância (Comum em confrontações simples)
export interface ModeloApenasDistancia {
  tipo: 'APENAS_DISTANCIA';
  verticeOrigem?: string;
  verticeDestino?: string;
  confrontante?: string; // Ex: "Confrontando com a Rua A"
  distanciaMetros: number;
}

// União Discriminada (Tipo Geral do Segmento Topográfico)
export type SegmentoTopografico =
  | ModeloCoordenadasEMedidas
  | ModeloRumoEDistancia
  | ModeloApenasDistancia;