
// src/services/extrator/regex.ts

// ======================================================
// 1. PADRÕES BÁSICOS
// ======================================================

// Números brasileiros: 10,00 | 10.490,13 | 118,75
const NUMERO = String.raw`(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?`;

// Coordenadas no formato apresentado pelo OCR:
// 7.410.242.9289 | 307.925.7590
const COORDENADA = String.raw`(?:\d{1,3}(?:\.\d{3}){1,2}\.\d{4}|\d{6,}[.,]\d{4})`;

// Azimutes: 97°20'42"
const AZIMUTE = String.raw`(?<graus>\d{1,3})\s*[°º]\s*(?<minutos>\d{1,2})\s*['′’]\s*(?<segundos>\d{1,2}(?:[,.]\d+)?)\s*["″”]`;

// Identificadores: 04-C, 06, 04-A, 212
const VERTICE = String.raw`[A-Z0-9]+(?:-[A-Z0-9]+)?`;

// ======================================================
// 2. TIPOS
// ======================================================

export interface Coordenada {
  vertice: string;
  norte: number;
  este: number;
  originalN: string;
  originalE: string;
}

export interface Medida {
  descricao: string;
  valor: number;
  unidade: "m";
  original: string;
}

export interface Azimute {
  graus: number;
  minutos: number;
  segundos: number;
  original: string;
}

export interface Segmento {
  origem?: string;
  destino: string;
  geometria: "reta" | "curva";
  distancia?: number;
  azimute?: Azimute;
  desenvolvimento?: number;
  raio?: number;
  anguloCentral?: Azimute;
  original: string;
}

export interface Confrontacao {
  descricao: string;
  original: string;
}

export interface ResultadoExtracao {
  textoOriginal: string;
  medidas: Medida[];
  coordenadas: Coordenada[];
  segmentos: Segmento[];
  confrontacoes: Confrontacao[];
  areaTotal?: number;
}

// ======================================================
// 3. CONVERSÃO DE VALORES
// ======================================================

function numeroBrasileiro(valor: string): number {
  return Number(
    valor.replace(/\./g, "").replace(",", ".")
  );
}

function numeroCoordenada(valor: string): number {
  const partes = valor.replace(",", ".").split(".");

  if (partes.length >= 3) {
    const inteiro = partes.slice(0, -1).join("");

    return Number(`${inteiro}.${partes[partes.length - 1]}`);
  }

  return Number(valor.replace(",", "."));
}

function extrairAzimute(valor: string): Azimute | null {
  const regex = new RegExp(AZIMUTE, "i");
  const resultado = valor.match(regex);

  if (!resultado?.groups) return null;

  return {
    graus: Number(resultado.groups.graus),
    minutos: Number(resultado.groups.minutos),
    segundos: Number(
      resultado.groups.segundos.replace(",", ".")
    ),
    original: resultado[0],
  };
}

// ======================================================
// 4. NORMALIZAÇÃO
// ======================================================

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n?/g, "\n");
}

// ======================================================
// 5. EXTRAÇÃO DE MEDIDAS CONVENCIONAIS
// ======================================================

function extrairMedidas(texto: string): Medida[] {
  const medidas: Medida[] = [];

  const padroes = [
    {
      descricao: "frente",
      regex: new RegExp(
        String.raw`frente\s+para\s+[^,;\n]+,?\s*para\s+onde\s+mede\s*(?<valor>${NUMERO})\s*(?:m\b|metros?\b)`,
        "gi"
      ),
    },
    {
      descricao: "lado direito",
      regex: new RegExp(
        String.raw`lado\s+direito\s+m[eè]de\s*(?<valor>${NUMERO})\s*(?:m\b|metros?\b)`,
        "gi"
      ),
    },
    {
      descricao: "lado esquerdo",
      regex: new RegExp(
        String.raw`lado\s+esquerdo\s+m[eè]de\s*(?<valor>${NUMERO})\s*(?:m\b|metros?\b)`,
        "gi"
      ),
    },
    {
      descricao: "fundos",
      regex: new RegExp(
        String.raw`fundos\s+m[eè]de\s*(?<valor>${NUMERO})\s*(?:m\b|metros?\b)`,
        "gi"
      ),
    },
  ];

  for (const padrao of padroes) {
    for (const match of texto.matchAll(padrao.regex)) {
      const valorOriginal = match.groups?.valor;

      if (!valorOriginal) continue;

      medidas.push({
        descricao: padrao.descricao,
        valor: numeroBrasileiro(valorOriginal),
        unidade: "m",
        original: match[0],
      });
    }
  }

  return medidas;
}

// ======================================================
// 6. EXTRAÇÃO DE COORDENADAS
// ======================================================

function extrairCoordenadas(texto: string): Coordenada[] {
  const coordenadas: Coordenada[] = [];

  const regex = new RegExp(
    String.raw`\bponto\s+(?<vertice>${VERTICE})\s*,?\s*de\s+coordenadas\s+N\s*[:=]\s*(?<n>${COORDENADA})\s*e\s*E\s*[:=]\s*(?<e>${COORDENADA})`,
    "gi"
  );

  for (const match of texto.matchAll(regex)) {
    const grupos = match.groups;

    if (!grupos) continue;

    coordenadas.push({
      vertice: grupos.vertice,
      norte: numeroCoordenada(grupos.n),
      este: numeroCoordenada(grupos.e),
      originalN: grupos.n,
      originalE: grupos.e,
    });
  }

  return coordenadas;
}

// ======================================================
// 7. EXTRAÇÃO DE SEGMENTOS RETOS
// ======================================================

function extrairSegmentosRetos(texto: string): Segmento[] {
  const segmentos: Segmento[] = [];

  const regex = new RegExp(
    String.raw`deste ponto\b[\s\S]{0,200}?(?:dist[âa]ncia)\s+(?:de\s+)?(?<distancia>${NUMERO})\s*(?:m\b|metros?\b)\s+e\s+azimute\s+(?:de\s+)?(?<azimute>\d{1,3}\s*[°º]\s*\d{1,2}\s*['′’]\s*\d{1,2}(?:[,.]\d+)?\s*["″”])[\s\S]{0,100}?\bat[eé]\s+o\s+ponto\s+(?<destino>${VERTICE})`,
    "gi"
  );

  for (const match of texto.matchAll(regex)) {
    const grupos = match.groups;

    if (!grupos) continue;

    const azimute = extrairAzimute(grupos.azimute);

    if (!azimute) continue;

    segmentos.push({
      destino: grupos.destino,
      geometria: "reta",
      distancia: numeroBrasileiro(grupos.distancia),
      azimute,
      original: match[0],
    });
  }

  return segmentos;
}

// ======================================================
// 8. EXTRAÇÃO DE CURVAS
// ======================================================

function extrairCurvas(texto: string): Segmento[] {
  const curvas: Segmento[] = [];

  const regex = new RegExp(
    String.raw`deste ponto\b[\s\S]{0,180}?segue em curva com desenvolvimento de\s*(?<desenvolvimento>${NUMERO})\s*m\b[\s\S]{0,60}?raio de\s*(?<raio>${NUMERO})\s*m\b[\s\S]{0,60}?ângulo central de\s*(?<angulo>\d{1,3}\s*[°º]\s*\d{1,2}\s*['′’]\s*\d{1,2}(?:[,.]\d+)?\s*["″”])[\s\S]{0,80}?\bat[eé]\s+o\s+ponto\s+(?<destino>${VERTICE})`,
    "gi"
  );

  for (const match of texto.matchAll(regex)) {
    const grupos = match.groups;

    if (!grupos) continue;

    const angulo = extrairAzimute(grupos.angulo);

    if (!angulo) continue;

    curvas.push({
      destino: grupos.destino,
      geometria: "curva",
      desenvolvimento: numeroBrasileiro(grupos.desenvolvimento),
      raio: numeroBrasileiro(grupos.raio),
      anguloCentral: angulo,
      original: match[0],
    });
  }

  return curvas;
}

// ======================================================
// 9. EXTRAÇÃO DE CONFRONTAÇÕES
// ======================================================

function extrairConfrontacoes(texto: string): Confrontacao[] {
  const confrontacoes: Confrontacao[] = [];

  const regex =
    /confronta(?:ndo)?\s+com\s+([\s\S]*?)(?=;|\bdeste ponto\b|\bencerrando\b|$)/gi;

  for (const match of texto.matchAll(regex)) {
    const valor = match[1]?.trim();

    if (!valor) continue;

    confrontacoes.push({
      descricao: valor.replace(/[.,]+$/, "").trim(),
      original: match[0],
    });
  }

  return confrontacoes;
}

// ======================================================
// 10. EXTRAÇÃO DA ÁREA TOTAL
// ======================================================

function extrairArea(texto: string): number | undefined {
  const regex = new RegExp(
    String.raw`(?:área|area)\s+total\s+de\s*(?<valor>${NUMERO})\s*(?:m\s*[²2])`,
    "i"
  );

  const resultado = texto.match(regex);

  if (!resultado?.groups?.valor) return undefined;

  return numeroBrasileiro(resultado.groups.valor);
}

// ======================================================
// 11. FUNÇÃO PRINCIPAL
// ======================================================

export function extrairInformacoes(
  textoOriginal: string
): ResultadoExtracao {
  const texto = normalizarTexto(textoOriginal);

  const segmentosRetos = extrairSegmentosRetos(texto);
  const curvas = extrairCurvas(texto);

  return {
    textoOriginal,
    medidas: extrairMedidas(texto),
    coordenadas: extrairCoordenadas(texto),
    segmentos: [...segmentosRetos, ...curvas],
    confrontacoes: extrairConfrontacoes(texto),
    areaTotal: extrairArea(texto),
  };
}
