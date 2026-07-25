export interface InfoPdf {
  Coordenadas?: Coordenadas[]
  Azimute?: string
  Distancia?: string
  Circulo?: true | false
  Rumo?: string
}
export interface Coordenadas {
  Latitude: string
  Longitude: string
}
export interface DadosDesmanteladosPDF {
  textoBruto: string
  coordenadas: Array<{ x: number; y: number }>
  paginas: number
}
