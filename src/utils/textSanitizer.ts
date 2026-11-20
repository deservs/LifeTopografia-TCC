// src/utils/textSanitizer.ts

// ======================================================
// 1. PADRÕES BÁSICOS
// ======================================================

// Números brasileiros (aceita vírgula ou ponto decimal do OCR): 10,00 | 10.00 | 10.490,13 | 118,75
const NUMERO = String.raw`(?:\d{1,3}(?:\.\d{3})+|\d+)(?:[.,]\d+)?`;

// Verbo medir com suporte a acentuações do português e variações de OCR (mede, mède, medindo, medem, com, por, extensão de):
const VERBO_MEDIR = String.raw`(?:m[eèéê]d(?:e|indo|em)|com|por|extens[aã]o\s+de)`;

// Padrão numérico de medida com suporte a hífens protetores de cartório (-368,35- ou -10,00-):
const NUMERO_MEDIDA = String.raw`[-–—\s]*(?<valor>${NUMERO})[-–—\s]*`;

// Coordenadas no formato apresentado pelo OCR:
// 7.410.242.9289 | 307.925.7590 | 7410242,9289 | 1000.0000
const COORDENADA = String.raw`(?:\d{1,3}(?:\.\d{3})+[.,]\d{2,4}|\d+[.,]\d{2,4})`;

// Azimutes: 97°20'42" | 97º20'42" | 97° 20' 42"
const AZIMUTE = String.raw`(?<graus>\d{1,3})\s*[°ºoO*]?\s*(?<minutos>\d{1,2})\s*['′’‘]\s*(?<segundos>\d{1,2}(?:[,.]\d+)?)\s*(?:["″””]|'')?`;

// Identificadores de vértices: 04-C, 06, 04-A, 212, P1, V-01, M-12
const VERTICE = String.raw`[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?`;

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
  ordem: number;
  origem?: string;
  destino: string;
  geometria: "reta" | "curva";
  distancia?: number;
  azimute?: Azimute;
  deflexao?: "direita" | "esquerda";
  desenvolvimento?: number;
  raio?: number;
  anguloCentral?: Azimute;
  original: string;
}

export interface Confrontacao {
  descricao: string;
  original: string;
}

export type TipoFormatoDescricao =
  | "georreferenciada"
  | "convencional"
  | "mista"
  | "insuficiente";

export interface ResultadoExtracao {
  textoOriginal: string;
  medidas: Medida[];
  coordenadas: Coordenada[];
  segmentos: Segmento[];
  confrontacoes: Confrontacao[];
  areaTotal?: number;
  formatoDescricao: TipoFormatoDescricao;
}

// ======================================================
// 3. CONVERSÃO DE VALORES
// ======================================================

export function sanitizarNumeroOcr(valor: string): string {
  if (!valor) return "";
  let v = valor.trim().replace(/^[-–—\s]+|[-–—\s]+$/g, "");
  // Corrige trocas de OCR em dígitos numéricos:
  v = v.replace(/l/g, "1").replace(/I/g, "1");
  v = v.replace(/(?<=[0-9,])o(?=[0-9,])/g, "0");
  v = v.replace(/(?<=[0-9,])O(?=[0-9,])/g, "0");
  v = v.replace(/,o/g, ",0").replace(/,O/g, ",0");
  v = v.replace(/o,/g, "0,").replace(/O,/g, "0,");
  return v;
}

export function numeroBrasileiro(valor: string): number {
  if (!valor) return 0;
  const limpo = sanitizarNumeroOcr(valor).replace(/\s+/g, "");

  // Se contém ponto e vírgula, ex: 10.490,13 -> remove ponto e troca vírgula por ponto
  if (limpo.includes(".") && limpo.includes(",")) {
    return Number(limpo.replace(/\./g, "").replace(",", "."));
  }

  // Se contém apenas vírgula, ex: 10,50 -> troca por ponto
  if (limpo.includes(",")) {
    return Number(limpo.replace(",", "."));
  }

  // Se contém apenas ponto, ex: 10.00 ou 22.19 (comum no OCR)
  return Number(limpo);
}

export function numeroCoordenada(valor: string): number {
  if (!valor) return 0;
  const limpo = valor.trim().replace(/\s+/g, "");
  const partes = limpo.replace(",", ".").split(".");

  if (partes.length >= 3) {
    const inteiro = partes.slice(0, -1).join("");
    return Number(`${inteiro}.${partes[partes.length - 1]}`);
  }

  return Number(limpo.replace(",", "."));
}

export function extrairAzimute(valor: string): Azimute | null {
  if (!valor) return null;
  const regex = new RegExp(AZIMUTE, "i");
  const resultado = valor.match(regex);

  if (!resultado?.groups) return null;

  const graus = Number(resultado.groups.graus);
  const minutos = Number(resultado.groups.minutos);
  const segundos = Number(
    (resultado.groups.segundos || "0").replace(",", ".")
  );

  if (!Number.isFinite(graus) || !Number.isFinite(minutos) || !Number.isFinite(segundos)) {
    return null;
  }

  return {
    graus,
    minutos,
    segundos,
    original: resultado[0].trim(),
  };
}

export function converterRumoParaAzimute(
  graus: number,
  minutos: number,
  segundos: number,
  quadrante: string,
  original: string
): Azimute {
  const q = quadrante.toUpperCase().replace("O", "W");
  const angulo = graus + minutos / 60 + segundos / 3600;
  let az = angulo;

  if (q === "NE") {
    az = angulo;
  } else if (q === "SE") {
    az = 180 - angulo;
  } else if (q === "SW" || q === "SO") {
    az = 180 + angulo;
  } else if (q === "NW" || q === "NO") {
    az = 360 - angulo;
  }

  if (az < 0) az += 360;
  if (az >= 360) az -= 360;

  const g = Math.floor(az);
  const mFloat = (az - g) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60 * 100) / 100;

  return {
    graus: g,
    minutos: m,
    segundos: s,
    original: original.trim(),
  };
}

export function extrairRumoOuAzimute(trecho: string): Azimute | null {
  if (!trecho) return null;

  // 1. Procura por Rumos com quadrante: "rumo de 75º 57'30" NE", "83229'54" SW", "22º2'06" NW", "l2s0l'-07" NW"
  const regexRumo = new RegExp(
    String.raw`rumo\s*(?:de\s*)?[-–—\s]*(?<ang>[\d\s°ºoO*'"′’‘″””ls\.-]+?)\s*(?<quad>N[EWSO]|S[EWSO]|NE|SE|SW|SO|NW|NO)\b`,
    "i"
  );
  const matchRumo = trecho.match(regexRumo);

  if (matchRumo?.groups) {
    const rawAng = matchRumo.groups.ang;
    const quad = matchRumo.groups.quad.toUpperCase();

    let limpo = rawAng
      .replace(/l/g, "1")
      .replace(/s/g, "°")
      .replace(/\s+/g, " ")
      .trim();

    // Se o grau virou 2 entre números, ex: 83229'54" -> 83°29'54"
    if (/^\d{2}2\d{2}/.test(limpo) && !limpo.includes("°") && !limpo.includes("º")) {
      limpo = limpo.slice(0, 2) + "°" + limpo.slice(3);
    }

    const az = extrairAzimute(limpo);
    if (az) {
      return converterRumoParaAzimute(az.graus, az.minutos, az.segundos, quad, matchRumo[0]);
    }

    // Se falhar o formato com símbolos, faz parse numérico livre
    const numeros = limpo.match(/\d+(?:[.,]\d+)?/g);
    if (numeros && numeros.length >= 1) {
      const g = Number(numeros[0]);
      const m = numeros.length > 1 ? Number(numeros[1]) : 0;
      const s = numeros.length > 2 ? Number(numeros[2].replace(",", ".")) : 0;
      return converterRumoParaAzimute(g, m, s, quad, matchRumo[0]);
    }
  }

  // 2. Azimute convencional
  return extrairAzimute(trecho);
}

// ======================================================
// 4. NORMALIZAÇÃO
// ======================================================

export function normalizarTexto(texto: string): string {
  let t = texto
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n?/g, "\n");

  // Higieniza erros comuns de OCR em termos de memorial topográfico:
  t = t
    .replace(/\bInioia-se\b/gi, "Inicia-se")
    .replace(/\benoontra-se\b/gi, "encontra-se")
    .replace(/\bextene[aã]o\b/gi, "extensão")
    .replace(/\bconoreto\b/gi, "concreto")
    .replace(/\bérea\b/gi, "área")
    .replace(/\bmts\s*2\b/gi, "m²")
    .replace(/\bmts\s*²\b/gi, "m²");

  return t;
}

// ======================================================
// 5. EXTRAÇÃO DE MEDIDAS CONVENCIONAIS
// ======================================================

function extrairMedidas(texto: string): Medida[] {
  const medidas: Medida[] = [];
  const capturas = new Map<string, { valor: number; original: string }>();

  const registrar = (desc: string, valStr: string, orig: string) => {
    const val = numeroBrasileiro(valStr);
    if (!Number.isFinite(val) || val <= 0) return;
    if (!capturas.has(desc)) {
      capturas.set(desc, { valor: val, original: orig.trim() });
    }
  };

  // 1. FRENTE
  const regexesFrente = [
    // "frente para ..., (para onde) mede/mède 10,00 m"
    new RegExp(String.raw`frente\s*[:=-]?\s*(?:para\s+[^,;\n]+,?\s*)?(?:para\s+onde\s+)?(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
    // "mede/medindo/com/por 10,00 metros de frente / pela frente / na frente / de testada"
    new RegExp(String.raw`(?:${VERBO_MEDIR})\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?\s+(?:de\s+frente|pela\s+frente|na\s+frente|de\s+testada)`, "gi"),
    // "10,00 metros de frente / pela frente / na frente"
    new RegExp(String.raw`${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)\s+(?:de\s+frente|pela\s+frente|na\s+frente|de\s+testada)`, "gi"),
    // "pela frente / na frente mede/medindo/com 10,00 metros"
    new RegExp(String.raw`(?:pela|na|de)\s+frente\s*[,:]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
    // "linha de/da frente ... 10,00 m"
    new RegExp(String.raw`linha\s+d[ea]\s+frente\s*[,:]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
  ];

  for (const r of regexesFrente) {
    for (const m of texto.matchAll(r)) {
      if (m.groups?.valor) registrar("frente", m.groups.valor, m[0]);
    }
  }

  // 2. LADO DIREITO
  const regexesLadoDireito = [
    // "lado direito / lateral direita mede/medindo/com 22,19 m"
    new RegExp(String.raw`(?:lado\s+direito|lateral\s+direita)\s*[:=-]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
    // "pelo lado direito / pela lateral direita / do lado direito / da lateral direita mede/medindo/com 22,19 m"
    new RegExp(String.raw`(?:pelo|do|no|pela|da|na)\s+(?:lado\s+direito|lateral\s+direita)\s*[,:]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
    // "mede/medindo/com/por 22,19 m do lado direito / pelo lado direito / à direita"
    new RegExp(String.raw`(?:${VERBO_MEDIR})\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?\s+(?:do\s+lado\s+direito|pelo\s+lado\s+direito|na\s+lateral\s+direita|pela\s+direita|[àa]\s+direita)`, "gi"),
    // "22,19 m do lado direito / pelo lado direito / à direita"
    new RegExp(String.raw`${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)\s+(?:do\s+lado\s+direito|pelo\s+lado\s+direito|na\s+lateral\s+direita|pela\s+direita|[àa]\s+direita)`, "gi"),
    // "da frente aos fundos do lado direito mede 22,19 m"
    new RegExp(String.raw`da\s+frente\s+aos\s+fundos\s+(?:do\s+lado\s+direito|pelo\s+lado\s+direito)\s*[,:]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
    // "à direita / pela direita mede 22,19 m"
    new RegExp(String.raw`(?:[àa]|pela)\s+direita\s*[,:]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
  ];

  for (const r of regexesLadoDireito) {
    for (const m of texto.matchAll(r)) {
      if (m.groups?.valor) registrar("lado direito", m.groups.valor, m[0]);
    }
  }

  // 3. LADO ESQUERDO
  const regexesLadoEsquerdo = [
    // "lado esquerdo / lateral esquerda mede/medindo/com 30,64 m"
    new RegExp(String.raw`(?:lado\s+esquerdo|lateral\s+esquerda)\s*[:=-]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
    // "pelo lado esquerdo / pela lateral esquerda / do lado esquerdo / da lateral esquerda mede/medindo/com 30,64 m"
    new RegExp(String.raw`(?:pelo|do|no|pela|da|na)\s+(?:lado\s+esquerdo|lateral\s+esquerda)\s*[,:]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
    // "mede/medindo/com/por 30,64 m do lado esquerdo / pelo lado esquerdo / à esquerda"
    new RegExp(String.raw`(?:${VERBO_MEDIR})\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?\s+(?:do\s+lado\s+esquerdo|pelo\s+lado\s+esquerdo|na\s+lateral\s+esquerda|pela\s+esquerda|[àa]\s+esquerda)`, "gi"),
    // "30,64 m do lado esquerdo / pelo lado esquerdo / à esquerda"
    new RegExp(String.raw`${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)\s+(?:do\s+lado\s+esquerdo|pelo\s+lado\s+esquerdo|na\s+lateral\s+esquerda|pela\s+esquerda|[àa]\s+esquerda)`, "gi"),
    // "da frente aos fundos do lado esquerdo mede 30,64 m"
    new RegExp(String.raw`da\s+frente\s+aos\s+fundos\s+(?:do\s+lado\s+esquerdo|pelo\s+lado\s+esquerdo)\s*[,:]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
    // "à esquerda / pela esquerda mede 30,64 m"
    new RegExp(String.raw`(?:[àa]|pela)\s+esquerda\s*[,:]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
  ];

  for (const r of regexesLadoEsquerdo) {
    for (const m of texto.matchAll(r)) {
      if (m.groups?.valor) registrar("lado esquerdo", m.groups.valor, m[0]);
    }
  }

  // 4. AMBOS OS LADOS (preenche direito e esquerdo se não existirem)
  const regexAmbosLados = new RegExp(
    String.raw`(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?\s+(?:da\s+frente\s+aos\s+fundos\s+)?(?:de|em)\s+ambos\s+os\s+lados`,
    "gi"
  );
  for (const m of texto.matchAll(regexAmbosLados)) {
    if (m.groups?.valor) {
      if (!capturas.has("lado direito")) registrar("lado direito", m.groups.valor, m[0]);
      if (!capturas.has("lado esquerdo")) registrar("lado esquerdo", m.groups.valor, m[0]);
    }
  }

  // 5. FUNDOS
  const regexesFundos = [
    // "fundos mede/medindo/com 10,00 m"
    new RegExp(String.raw`\bfundos\s*[:=-]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
    // "pelos fundos / nos fundos / aos fundos mede/medindo/com 10,00 m"
    new RegExp(String.raw`(?:pelos|nos|aos|de)\s+fundos\s*[,:]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
    // "mede/medindo/com/por 10,00 m nos fundos / pelos fundos / de fundos"
    new RegExp(String.raw`(?:${VERBO_MEDIR})\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?\s+(?:nos\s+fundos|pelos\s+fundos|aos\s+fundos|de\s+fundos)`, "gi"),
    // "10,00 m nos fundos / pelos fundos / de fundos"
    new RegExp(String.raw`${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)\s+(?:nos\s+fundos|pelos\s+fundos|aos\s+fundos|de\s+fundos)`, "gi"),
    // "linha dos/de fundos ... 10,00 m"
    new RegExp(String.raw`linha\s+d(?:os|e)\s+fundos\s*[,:]?\s*(?:${VERBO_MEDIR})?\s*${NUMERO_MEDIDA}\s*(?:m\b|metros?\b)?`, "gi"),
  ];

  for (const r of regexesFundos) {
    for (const m of texto.matchAll(r)) {
      if (m.groups?.valor) registrar("fundos", m.groups.valor, m[0]);
    }
  }

  for (const [desc, c] of capturas) {
    medidas.push({
      descricao: desc,
      valor: c.valor,
      unidade: "m",
      original: c.original,
    });
  }

  return medidas;
}

// ======================================================
// 6. EXTRAÇÃO DE COORDENADAS
// ======================================================

function extrairCoordenadas(texto: string): Coordenada[] {
  interface MatchCoordenada {
    posicao: number;
    coordenada: Coordenada;
  }

  const matchesEncontrados: MatchCoordenada[] = [];

  // Padrão 1: "ponto XX, de coordenadas N = ... e E = ..." ou N: ... ; E: ...
  const regex1 = new RegExp(
    String.raw`\b(?:ponto|v[eé]rtice|marco)\s+(?<vertice>${VERTICE})\s*,?\s*(?:de\s+coordenadas\s+)?N\s*[:=]\s*(?<n>${COORDENADA})\s*[;e,\s]+E\s*[:=]\s*(?<e>${COORDENADA})`,
    "gi"
  );

  for (const match of texto.matchAll(regex1)) {
    const grupos = match.groups;
    if (!grupos) continue;

    matchesEncontrados.push({
      posicao: match.index ?? 0,
      coordenada: {
        vertice: grupos.vertice.toUpperCase(),
        norte: numeroCoordenada(grupos.n),
        este: numeroCoordenada(grupos.e),
        originalN: grupos.n,
        originalE: grupos.e,
      },
    });
  }

  // Padrão 2: "N = ... e E = ... do ponto XX" ou formato inverso
  const regex2 = new RegExp(
    String.raw`\bN\s*[:=]\s*(?<n>${COORDENADA})\s*[;e,\s]+E\s*[:=]\s*(?<e>${COORDENADA})[\s\S]{0,40}?\b(?:ponto|v[eé]rtice)\s+(?<vertice>${VERTICE})`,
    "gi"
  );

  for (const match of texto.matchAll(regex2)) {
    const grupos = match.groups;
    if (!grupos) continue;

    const pos = match.index ?? 0;
    if (matchesEncontrados.some((m) => Math.abs(m.posicao - pos) < 30)) continue;

    matchesEncontrados.push({
      posicao: pos,
      coordenada: {
        vertice: grupos.vertice.toUpperCase(),
        norte: numeroCoordenada(grupos.n),
        este: numeroCoordenada(grupos.e),
        originalN: grupos.n,
        originalE: grupos.e,
      },
    });
  }

  // Ordena rigorosamente na ordem em que aparecem no memorial
  matchesEncontrados.sort((a, b) => a.posicao - b.posicao);

  // Remove apenas duplicatas consecutivas imediatas da mesma posição física (erro de repetição do OCR)
  const coordenadas: Coordenada[] = [];
  for (const item of matchesEncontrados) {
    if (coordenadas.length > 0) {
      const anterior = coordenadas[coordenadas.length - 1];
      if (
        anterior.vertice === item.coordenada.vertice &&
        Math.abs(anterior.norte - item.coordenada.norte) < 0.0001 &&
        Math.abs(anterior.este - item.coordenada.este) < 0.0001 &&
        Math.abs(item.posicao - (matchesEncontrados.find((m) => m.coordenada === anterior)?.posicao ?? 0)) < 40
      ) {
        continue;
      }
    }
    coordenadas.push(item.coordenada);
  }

  return coordenadas;
}

// ======================================================
// 7. EXTRAÇÃO DE SEGMENTOS NA SEQUÊNCIA DO PERÍMETRO
// ======================================================

function extrairVerticeInicial(texto: string): string | null {
  // 1. Ponto ou marco entre aspas (ex: denominado Ponto "D" ou Marco "01")
  const regexAspas = new RegExp(
    String.raw`(?:\binicia(?:-se)?|\bcomeça|\bpartindo|\bpartir)[\s\S]{0,150}?\b(?:ponto|v[eé]rtice|marco)\s*["“'](?<vertice>[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?)["”']`,
    "i"
  );
  const matchAspas = texto.match(regexAspas);
  if (matchAspas?.groups?.vertice) {
    return matchAspas.groups.vertice.toUpperCase();
  }

  // 2. Denominado Ponto X ou Marco X
  const regexDenominado = new RegExp(
    String.raw`(?:\binicia(?:-se)?|\bcomeça|\bpartindo|\bpartir)[\s\S]{0,150}?\bdenominado\s+(?:ponto|v[eé]rtice|marco)\s*["“']?(?<vertice>[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?)["”']?`,
    "i"
  );
  const matchDenom = texto.match(regexDenominado);
  if (matchDenom?.groups?.vertice) {
    return matchDenom.groups.vertice.toUpperCase();
  }

  // 3. Padrão geral: 'no ponto 04-C', 'no vértice V1'
  const regexGeral = new RegExp(
    String.raw`(?:\binicia(?:-se)?|\bcomeça|\bpartindo|\bpartir)\s+(?:a\s+descri[çc][aã]o\s+(?:deste\s+per[íi]metro\s+)?(?:no|do)\s+)?(?:ponto|v[eé]rtice|marco)\s+["“']?(?<vertice>${VERTICE})["”']?`,
    "i"
  );
  const matchGeral = texto.match(regexGeral);
  return matchGeral?.groups?.vertice?.toUpperCase() ?? null;
}

function extrairSegmentosUnificados(texto: string): Segmento[] {
  const segmentos: Segmento[] = [];
  const verticeInicial = extrairVerticeInicial(texto);

  // Reconhece marcos de parada: até o ponto X, encontra-se com o ponto X, atinge o ponto X
  const regexAtePonto = new RegExp(
    String.raw`(?:\bat[eé]|encontra(?:-se)?|enoontra(?:-se)?|atinge|chega(?:-se)?)\s*[-–—\s]*(?:com\s+)?(?:o\s*[-–—\s]*)?[\s\S]{0,35}?\b(?:ponto|v[eé]rtice|marco)\s*["“']?(?<destino>${VERTICE})["”']?`,
    "gi"
  );

  const posicoesAte: { index: number; destino: string; textoMatch: string }[] = [];
  for (const m of texto.matchAll(regexAtePonto)) {
    if (m.groups?.destino) {
      posicoesAte.push({
        index: m.index ?? 0,
        destino: m.groups.destino.toUpperCase(),
        textoMatch: m[0],
      });
    }
  }

  if (posicoesAte.length > 0) {
    let cursor = 0;
    let origemAtual = verticeInicial;

    for (let i = 0; i < posicoesAte.length; i++) {
      const ate = posicoesAte[i];
      const fimTrecho = ate.index + ate.textoMatch.length;
      const trechoSegmento = texto.substring(cursor, fimTrecho);
      cursor = fimTrecho;

      const seg = analisarTrechoSegmento(trechoSegmento, ate.destino, origemAtual, i);
      if (seg) {
        segmentos.push(seg);
        origemAtual = seg.destino;
      }
    }
  }

  if (segmentos.length === 0) {
    return extrairSegmentosPadrao(texto, verticeInicial);
  }

  return segmentos;
}

function analisarTrechoSegmento(
  trecho: string,
  destino: string,
  origem: string | null,
  ordem: number
): Segmento | null {
  const trechoLower = trecho.toLowerCase();
  const eCurva =
    trechoLower.includes("curva") ||
    trechoLower.includes("raio") ||
    trechoLower.includes("desenvolvimento");

  const regexDistancia = new RegExp(
    String.raw`(?:\bdist[âa]ncia|\bextens[aã]o|\bextene[aã]o|\bextensao|\bextencao)\s*(?:de\s*)?[-–—\s]*(?<distancia>[0-9lLoO.,]+)\s*(?:m\b|mts?\b|metros?\b)`,
    "i"
  );
  const regexDesenv = new RegExp(
    String.raw`(?:desenvolvimento|desenv\.?)\s+(?:de\s+)?(?<desenv>${NUMERO})\s*m\b`,
    "i"
  );
  const regexRaio = new RegExp(
    String.raw`raio\s+(?:de\s+)?(?<raio>${NUMERO})\s*m\b`,
    "i"
  );
  const regexAngulo = new RegExp(
    String.raw`[âa]ngulo\s+central\s+(?:de\s+)?(?<angulo>\d{1,3}\s*[°ºoO*]?\s*\d{1,2}\s*['′’‘]\s*\d{1,2}(?:[,.]\d+)?\s*(?:["″””]|'')?)`,
    "i"
  );

  if (eCurva) {
    const matchDesenv = trecho.match(regexDesenv);
    const matchRaio = trecho.match(regexRaio);
    const matchAngulo = trecho.match(regexAngulo);

    const desenv = matchDesenv?.groups?.desenv
      ? numeroBrasileiro(matchDesenv.groups.desenv)
      : undefined;
    const raio = matchRaio?.groups?.raio
      ? numeroBrasileiro(matchRaio.groups.raio)
      : undefined;
    const angulo = matchAngulo?.groups?.angulo
      ? extrairAzimute(matchAngulo.groups.angulo) ?? undefined
      : undefined;

    let deflexao: "direita" | "esquerda" | undefined = undefined;
    if (/deflex[aã]o\s+(?:à|a)\s+direita|curva\s+(?:à|a)\s+direita/i.test(trecho)) {
      deflexao = "direita";
    } else if (/deflex[aã]o\s+(?:à|a)\s+esquerda|curva\s+(?:à|a)\s+esquerda/i.test(trecho)) {
      deflexao = "esquerda";
    }

    return {
      ordem,
      origem: origem ?? undefined,
      destino,
      geometria: "curva",
      desenvolvimento: desenv,
      raio,
      anguloCentral: angulo,
      deflexao,
      original: trecho.trim(),
    };
  }

  const matchDist = trecho.match(regexDistancia);
  const azimute = extrairRumoOuAzimute(trecho) ?? undefined;

  let distancia: number | undefined = undefined;
  if (matchDist?.groups?.distancia) {
    distancia = numeroBrasileiro(sanitizarNumeroOcr(matchDist.groups.distancia));
  }

  if (distancia === undefined && azimute === undefined) {
    const numSolto = trecho.match(new RegExp(String.raw`(?<valor>[0-9lLoO.,]+)\s*(?:m\b|mts?\b|metros?\b)`, "i"));
    if (numSolto?.groups?.valor) {
      distancia = numeroBrasileiro(sanitizarNumeroOcr(numSolto.groups.valor));
    }
  }

  let deflexao: "direita" | "esquerda" | undefined = undefined;
  if (/deflete\s+(?:à|a)\s+direita/i.test(trecho)) {
    deflexao = "direita";
  } else if (/deflete\s+(?:à|a)\s+esquerda/i.test(trecho)) {
    deflexao = "esquerda";
  }

  return {
    ordem,
    origem: origem ?? undefined,
    destino,
    geometria: "reta",
    distancia,
    azimute,
    deflexao,
    original: trecho.trim(),
  };
}

export function reconstruirCoordenadasPoligonal(
  verticeInicial: string,
  segmentos: Segmento[]
): Coordenada[] {
  if (segmentos.length < 3) return [];

  const ORIGEM_E = 1000.0;
  const ORIGEM_N = 1000.0;

  interface PontoCalc {
    vertice: string;
    este: number;
    norte: number;
    calculado: boolean;
  }

  const verticesNomes = [verticeInicial, ...segmentos.map((s) => s.destino)];
  const pontos: PontoCalc[] = verticesNomes.map((v, i) => ({
    vertice: v,
    este: i === 0 ? ORIGEM_E : 0,
    norte: i === 0 ? ORIGEM_N : 0,
    calculado: i === 0,
  }));

  const fechaNoInicio = verticesNomes[verticesNomes.length - 1] === verticeInicial;
  if (fechaNoInicio) {
    pontos[pontos.length - 1].este = ORIGEM_E;
    pontos[pontos.length - 1].norte = ORIGEM_N;
    pontos[pontos.length - 1].calculado = true;
  }

  // 1. Passada direta (ida)
  for (let i = 0; i < segmentos.length; i++) {
    const seg = segmentos[i];
    const pAtual = pontos[i];
    const pProx = pontos[i + 1];

    if (pAtual.calculado && !pProx.calculado && seg.distancia && seg.azimute) {
      const azDec = seg.azimute.graus + seg.azimute.minutos / 60 + seg.azimute.segundos / 3600;
      const azRad = (azDec * Math.PI) / 180;

      pProx.este = pAtual.este + seg.distancia * Math.sin(azRad);
      pProx.norte = pAtual.norte + seg.distancia * Math.cos(azRad);
      pProx.calculado = true;
    }
  }

  // 2. Passada reversa (volta a partir do fechamento final)
  for (let i = segmentos.length - 1; i >= 0; i--) {
    const seg = segmentos[i];
    const pAtual = pontos[i];
    const pProx = pontos[i + 1];

    if (pProx.calculado && !pAtual.calculado && seg.distancia && seg.azimute) {
      const azDec = seg.azimute.graus + seg.azimute.minutos / 60 + seg.azimute.segundos / 3600;
      const azRad = (azDec * Math.PI) / 180;

      pAtual.este = pProx.este - seg.distancia * Math.sin(azRad);
      pAtual.norte = pProx.norte - seg.distancia * Math.cos(azRad);
      pAtual.calculado = true;
    }
  }

  // 3. Interpolação para segmentos intermediários sem azimute explícito
  for (let i = 0; i < segmentos.length; i++) {
    const seg = segmentos[i];
    const pAtual = pontos[i];
    const pProx = pontos[i + 1];

    if (pAtual.calculado && pProx.calculado && !seg.azimute) {
      const de = pProx.este - pAtual.este;
      const dn = pProx.norte - pAtual.norte;
      const distCalc = Math.hypot(de, dn);
      let azRad = Math.atan2(de, dn);
      if (azRad < 0) azRad += 2 * Math.PI;
      const azGrausFloat = (azRad * 180) / Math.PI;
      const g = Math.floor(azGrausFloat);
      const mFloat = (azGrausFloat - g) * 60;
      const m = Math.floor(mFloat);
      const s = Math.round((mFloat - m) * 60 * 100) / 100;

      seg.azimute = {
        graus: g,
        minutos: m,
        segundos: s,
        original: `${g}°${m}'${s.toFixed(0)}" (topografia calculada)`,
      };
      if (!seg.distancia) {
        seg.distancia = Math.round(distCalc * 100) / 100;
      }
    }
  }

  return pontos.map((p) => ({
    vertice: p.vertice,
    este: Math.round(p.este * 10000) / 10000,
    norte: Math.round(p.norte * 10000) / 10000,
    originalE: p.este.toFixed(4),
    originalN: p.norte.toFixed(4),
  }));
}

function extrairSegmentosPadrao(texto: string, verticeInicial: string | null): Segmento[] {
  interface MatchSegmento {
    posicao: number;
    segmento: Omit<Segmento, "ordem">;
  }

  const matches: MatchSegmento[] = [];

  const regexReta = new RegExp(
    String.raw`deste ponto\b[\s\S]{0,250}?(?:dist[âa]ncia)\s+(?:de\s+)?(?<distancia>${NUMERO})\s*(?:m\b|metros?\b)[\s\S]{0,100}?azimute\s+(?:de\s+)?(?<azimute>\d{1,3}\s*[°ºoO*]?\s*\d{1,2}\s*['′’‘]\s*\d{1,2}(?:[,.]\d+)?\s*(?:["″””]|'')?)[\s\S]{0,200}?\bat[eé]\s+(?:o\s+)?(?:ponto|v[eé]rtice)\s+(?<destino>${VERTICE})`,
    "gi"
  );
  for (const match of texto.matchAll(regexReta)) {
    if (!match.groups) continue;
    matches.push({
      posicao: match.index ?? 0,
      segmento: {
        destino: match.groups.destino.toUpperCase(),
        geometria: "reta",
        distancia: numeroBrasileiro(match.groups.distancia),
        azimute: extrairAzimute(match.groups.azimute) ?? undefined,
        original: match[0],
      },
    });
  }

  const regexReta2 = new RegExp(
    String.raw`deste ponto\b[\s\S]{0,250}?azimute\s+(?:de\s+)?(?<azimute>\d{1,3}\s*[°ºoO*]?\s*\d{1,2}\s*['′’‘]\s*\d{1,2}(?:[,.]\d+)?\s*(?:["″””]|'')?)[\s\S]{0,100}?(?:dist[âa]ncia)\s+(?:de\s+)?(?<distancia>${NUMERO})\s*(?:m\b|metros?\b)[\s\S]{0,200}?\bat[eé]\s+(?:o\s+)?(?:ponto|v[eé]rtice)\s+(?<destino>${VERTICE})`,
    "gi"
  );
  for (const match of texto.matchAll(regexReta2)) {
    if (!match.groups) continue;
    const pos = match.index ?? 0;
    if (matches.some((m) => Math.abs(m.posicao - pos) < 30)) continue;
    matches.push({
      posicao: pos,
      segmento: {
        destino: match.groups.destino.toUpperCase(),
        geometria: "reta",
        distancia: numeroBrasileiro(match.groups.distancia),
        azimute: extrairAzimute(match.groups.azimute) ?? undefined,
        original: match[0],
      },
    });
  }

  const regexCurva = new RegExp(
    String.raw`deste ponto\b[\s\S]{0,250}?(?:segue\s+(?:por|em)\s+curva|curva)[\s\S]{0,50}?(?:desenvolvimento|desenv)\s+(?:de\s+)?(?<desenv>${NUMERO})\s*m\b[\s\S]{0,100}?raio\s+(?:de\s+)?(?<raio>${NUMERO})\s*m\b[\s\S]{0,100}?[âa]ngulo\s+central\s+(?:de\s+)?(?<angulo>\d{1,3}\s*[°ºoO*]?\s*\d{1,2}\s*['′’‘]\s*\d{1,2}(?:[,.]\d+)?\s*(?:["″””]|'')?)[\s\S]{0,200}?\bat[eé]\s+(?:o\s+)?(?:ponto|v[eé]rtice)\s+(?<destino>${VERTICE})`,
    "gi"
  );
  for (const match of texto.matchAll(regexCurva)) {
    if (!match.groups) continue;
    matches.push({
      posicao: match.index ?? 0,
      segmento: {
        destino: match.groups.destino.toUpperCase(),
        geometria: "curva",
        desenvolvimento: numeroBrasileiro(match.groups.desenv),
        raio: numeroBrasileiro(match.groups.raio),
        anguloCentral: extrairAzimute(match.groups.angulo) ?? undefined,
        original: match[0],
      },
    });
  }

  matches.sort((a, b) => a.posicao - b.posicao);

  let origemAtual = verticeInicial;
  return matches.map((m, idx) => {
    const s: Segmento = {
      ...m.segmento,
      ordem: idx,
      origem: origemAtual ?? undefined,
    };
    origemAtual = s.destino;
    return s;
  });
}

// ======================================================
// 8. EXTRAÇÃO DE CONFRONTAÇÕES
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
// 9. EXTRAÇÃO DA ÁREA TOTAL
// ======================================================

function extrairArea(texto: string): number | undefined {
  const regexes = [
    new RegExp(
      String.raw`(?:área|area|érea)\s+(?:total\s+)?(?:de\s+)?[-–—\s]*(?<valor>${NUMERO})[-–—\s]*(?:m\s*[²2]|mts\s*[²2]|metros\s*quadrados)`,
      "i"
    ),
    new RegExp(
      String.raw`(?:que\s+)?mede\s+[-–—\s]*(?<valor>${NUMERO})\s*(?:m\s*[²2]|mts\s*[²2]|metros\s*quadrados)`,
      "i"
    ),
  ];

  for (const r of regexes) {
    const resultado = texto.match(r);
    if (resultado?.groups?.valor) {
      return numeroBrasileiro(resultado.groups.valor);
    }
  }

  return undefined;
}

// ======================================================
// 10. CLASSIFICAÇÃO DO FORMATO
// ======================================================

function identificarFormato(
  coordenadas: Coordenada[],
  segmentos: Segmento[],
  medidas: Medida[]
): TipoFormatoDescricao {
  const temCoordenadas = coordenadas.length > 0;
  const temSegmentos = segmentos.length > 0;
  const temMedidas = medidas.length > 0;

  if (temCoordenadas && (temSegmentos || temMedidas)) {
    return temMedidas && !temSegmentos ? "mista" : "georreferenciada";
  }

  if (temCoordenadas) return "georreferenciada";
  if (temMedidas) return "convencional";

  return "insuficiente";
}

// ======================================================
// 11. FUNÇÃO PRINCIPAL
// ======================================================

export function extrairInformacoes(textoOriginal: string): ResultadoExtracao {
  const texto = normalizarTexto(textoOriginal);

  let coordenadas = extrairCoordenadas(texto);
  const segmentos = extrairSegmentosUnificados(texto);
  const medidas = extrairMedidas(texto);
  const confrontacoes = extrairConfrontacoes(texto);
  const areaTotal = extrairArea(texto);

  // Se o memorial não tem coordenadas UTM explícitas, mas possui uma poligonal topográfica
  // com vértices, distâncias e azimutes/rumos sequenciais, reconstrói as coordenadas:
  if (coordenadas.length === 0 && segmentos.length >= 3) {
    const verticeInicial = extrairVerticeInicial(texto);
    if (verticeInicial) {
      coordenadas = reconstruirCoordenadasPoligonal(verticeInicial, segmentos);
    }
  }

  const formatoDescricao = identificarFormato(coordenadas, segmentos, medidas);

  return {
    textoOriginal,
    medidas,
    coordenadas,
    segmentos,
    confrontacoes,
    areaTotal,
    formatoDescricao,
  };
}

// ======================================================
// 12. SEPARAÇÃO DE MÚLTIPLOS TERRENOS
// ======================================================

export interface TerrenoExtraido {
  id: string;
  titulo: string;
  intervaloPaginas?: string;
  textoOriginal: string;
  resultado: ResultadoExtracao;
}

export interface OpcoesSeparacaoTerrenos {
  expectedLotsCount?: number;
  qtdEsperada?: number;
  intervalosManuais?: { titulo?: string; texto: string; intervaloPaginas?: string }[];
}

export interface ResultadoSeparacaoTerrenos {
  terrenos: TerrenoExtraido[];
  expectedLotsCount: number;
  divergenciaQtd: boolean; // lots.length !== expectedLotsCount
}

export interface TerrenosExtraidosLista extends Array<TerrenoExtraido> {
  expectedLotsCount: number;
  divergenciaQtd: boolean;
}

function formatarTituloTerreno(tituloCru: string): string {
  const limpo = tituloCru.replace(/[:=–—\n\r]+$/, "").trim();
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

function extrairIntervaloPaginasDoTexto(texto: string): string | undefined {
  const regex = /---\s*P[ÁA]GINA\s+(\d+)\s*---/gi;
  const pags: number[] = [];
  for (const m of texto.matchAll(regex)) {
    if (m[1]) pags.push(Number(m[1]));
  }
  if (pags.length === 0) return undefined;
  const min = Math.min(...pags);
  const max = Math.max(...pags);
  return min === max ? `Pág. ${min}` : `Págs. ${min} a ${max}`;
}

export function separarTerrenosComResultado(
  textoCompleto: string,
  opcoes?: OpcoesSeparacaoTerrenos
): ResultadoSeparacaoTerrenos {
  const expectedLotsCount = Math.max(1, opcoes?.expectedLotsCount ?? opcoes?.qtdEsperada ?? 1);

  // 1. Se o usuário forneceu blocos manuais, processa cada um diretamente
  if (opcoes?.intervalosManuais && opcoes.intervalosManuais.length > 0) {
    const terrenos = opcoes.intervalosManuais.map((item, idx) => {
      const res = extrairInformacoes(item.texto);
      return {
        id: `terreno-${idx + 1}`,
        titulo: item.titulo?.trim() || `Terreno ${idx + 1}`,
        intervaloPaginas: item.intervaloPaginas,
        textoOriginal: item.texto,
        resultado: res,
      };
    });
    return {
      terrenos,
      expectedLotsCount,
      divergenciaQtd: terrenos.length !== expectedLotsCount,
    };
  }

  // 2. Se o usuário explicitou apenas 1 terreno, não tenta dividir
  if (expectedLotsCount === 1) {
    const res = extrairInformacoes(textoCompleto);
    const terrenos: TerrenoExtraido[] = [
      {
        id: "terreno-1",
        titulo: "Terreno 1",
        intervaloPaginas: extrairIntervaloPaginasDoTexto(textoCompleto),
        textoOriginal: textoCompleto,
        resultado: res,
      },
    ];
    return {
      terrenos,
      expectedLotsCount: 1,
      divergenciaQtd: false,
    };
  }

  // 3. Procura divisores de múltiplos terrenos
  const regexDivisores = [
    // Lote / Gleba / Imóvel / Terreno no início de linha ou após pontuação
    /(?:^|\n|\r)\s*(?:[-–—*#\s]*)(?<titulo>(?:lote|gleba|im[óo]vel|[aá]rea|terreno)\s+(?:n[º°o]?\s*)?[\w\d.-]+)\s*[:=-]/gi,
    // "Inicia-se a descrição deste perímetro" ou "Inicia-se no ponto/vértice/marco"
    /(?:^|\n|\r)\s*(?<titulo>inicia-se\s+a\s+descri[çc][ãa]o\s+deste\s+per[íi]metro|inicia-se\s+n[ou]\s+(?:ponto|v[eé]rtice|marco)\s+[\w\d.-]+)/gi,
    // "Um terreno urbano constituído pelo..." ou "Uma gleba de terras..." ou "Uma área de terras..."
    /(?:^|\n|\r)\s*(?<titulo>um\s+terreno\s+(?:urbano|rural)\b|uma\s+(?:gleba|[aá]rea)\s+de\s+terras?\b)/gi,
    // "MATRÍCULA Nº ..."
    /(?:^|\n|\r)\s*(?<titulo>matr[íi]cula\s+(?:n[º°o]?\s*)?[\d.]+)/gi,
    // "ITEM 1", "ITEM 2", "1º IMÓVEL"
    /(?:^|\n|\r)\s*(?<titulo>(?:item|\d+[º°])\s+[\w\d.-]+)\s*[:=-]/gi,
  ];

  interface PontoCorte {
    posicao: number;
    tituloSugerido: string;
  }

  const cortes: PontoCorte[] = [];

  for (const regex of regexDivisores) {
    for (const match of textoCompleto.matchAll(regex)) {
      const pos = match.index ?? 0;
      if (!cortes.some((c) => Math.abs(c.posicao - pos) < 80)) {
        const tit = match.groups?.titulo || match[0].trim();
        cortes.push({
          posicao: pos,
          tituloSugerido: formatarTituloTerreno(tit),
        });
      }
    }
  }

  cortes.sort((a, b) => a.posicao - b.posicao);

  if (cortes.length <= 1) {
    const res = extrairInformacoes(textoCompleto);
    const terrenos: TerrenoExtraido[] = [
      {
        id: "terreno-1",
        titulo: "Terreno 1",
        intervaloPaginas: extrairIntervaloPaginasDoTexto(textoCompleto),
        textoOriginal: textoCompleto,
        resultado: res,
      },
    ];
    return {
      terrenos,
      expectedLotsCount,
      divergenciaQtd: terrenos.length !== expectedLotsCount,
    };
  }

  const blocos: { texto: string; titulo: string }[] = [];

  if (cortes[0].posicao > 150) {
    const textoPrevio = textoCompleto.slice(0, cortes[0].posicao).trim();
    const infoPrevia = extrairInformacoes(textoPrevio);
    if (infoPrevia.coordenadas.length >= 3 || infoPrevia.medidas.length >= 2) {
      blocos.push({
        texto: textoPrevio,
        titulo: "Terreno 1",
      });
    }
  }

  for (let i = 0; i < cortes.length; i++) {
    const inicio = cortes[i].posicao;
    const fim = i + 1 < cortes.length ? cortes[i + 1].posicao : textoCompleto.length;
    const trecho = textoCompleto.slice(inicio, fim).trim();

    if (trecho.length > 20) {
      blocos.push({
        texto: trecho,
        titulo: cortes[i].tituloSugerido || `Terreno ${blocos.length + 1}`,
      });
    }
  }

  const terrenos: TerrenoExtraido[] = [];

  for (let i = 0; i < blocos.length; i++) {
    const bloco = blocos[i];
    const res = extrairInformacoes(bloco.texto);

    const temDados =
      res.coordenadas.length > 0 || res.medidas.length > 0 || res.areaTotal !== undefined;

    if (temDados) {
      terrenos.push({
        id: `terreno-${terrenos.length + 1}`,
        titulo: bloco.titulo.startsWith("Terreno")
          ? `Terreno ${terrenos.length + 1}`
          : `Terreno ${terrenos.length + 1} (${bloco.titulo})`,
        intervaloPaginas: extrairIntervaloPaginasDoTexto(bloco.texto),
        textoOriginal: bloco.texto,
        resultado: res,
      });
    }
  }

  if (terrenos.length === 0) {
    const res = extrairInformacoes(textoCompleto);
    terrenos.push({
      id: "terreno-1",
      titulo: "Terreno 1",
      intervaloPaginas: extrairIntervaloPaginasDoTexto(textoCompleto),
      textoOriginal: textoCompleto,
      resultado: res,
    });
  }

  return {
    terrenos,
    expectedLotsCount,
    divergenciaQtd: terrenos.length !== expectedLotsCount,
  };
}

export function separarTerrenos(
  textoCompleto: string,
  opcoes?: OpcoesSeparacaoTerrenos
): TerrenosExtraidosLista {
  const resultado = separarTerrenosComResultado(textoCompleto, opcoes);
  const lista = [...resultado.terrenos] as TerrenosExtraidosLista;
  lista.expectedLotsCount = resultado.expectedLotsCount;
  lista.divergenciaQtd = resultado.divergenciaQtd;
  return lista;
}
