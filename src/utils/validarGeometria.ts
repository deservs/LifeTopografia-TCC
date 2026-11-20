// src/utils/validarGeometria.ts

import type {
  Coordenada,
  ResultadoExtracao,
  Segmento,
  TipoFormatoDescricao,
} from "./textSanitizer";

// ======================================================
// 1. TIPOS
// ======================================================

export type Severidade = "erro" | "aviso" | "informacao";

export type TipoDescricao = TipoFormatoDescricao;

export type TipoDiagnostico =
  | "coordenada_invalida"
  | "coordenada_ausente"
  | "coordenada_duplicada"
  | "distancia_divergente"
  | "curva_divergente"
  | "corda_divergente"
  | "perimetro_aberto"
  | "dados_insuficientes"
  | "medida_invalida"
  | "medida_duplicada"
  | "segmento_ausente"
  | "formato_identificado";

export interface DiagnosticoGeometria {
  tipo: TipoDiagnostico;
  severidade: Severidade;
  mensagem: string;
  vertices?: string[];
  valores?: Record<string, number | string>;
}

export interface OpcoesValidacao {
  toleranciaDistancia?: number;
  toleranciaCurva?: number;
  toleranciaFechamento?: number;
}

export interface ResultadoValidacao {
  tipoDescricao: TipoDescricao;
  diagnosticos: DiagnosticoGeometria[];
  resumo: {
    total: number;
    erros: number;
    avisos: number;
    informacoes: number;
    possuiDivergencias: boolean;
    permiteGeracaoDXF: boolean;
    dxfAproximado: boolean;
  };
}

// ======================================================
// 2. CONFIGURAÇÕES
// ======================================================

const TOLERANCIAS_PADRAO = {
  // Diferença aceitável entre distâncias em metros (5 cm).
  toleranciaDistancia: 0.05,

  // Diferença aceitável no desenvolvimento da curva (5 cm).
  toleranciaCurva: 0.05,

  // Distância máxima para considerar o perímetro fechado (5 cm).
  toleranciaFechamento: 0.05,
};

// ======================================================
// 3. FUNÇÕES MATEMÁTICAS
// ======================================================

function distanciaEntrePontos(a: Coordenada, b: Coordenada): number {
  return Math.hypot(b.este - a.este, b.norte - a.norte);
}

function anguloEmGraus(
  angulo: NonNullable<Segmento["anguloCentral"]>
): number {
  return (
    angulo.graus +
    angulo.minutos / 60 +
    angulo.segundos / 3600
  );
}

function grausParaRadianos(graus: number): number {
  return (graus * Math.PI) / 180;
}

function desenvolvimentoCalculado(raio: number, anguloGraus: number): number {
  return raio * grausParaRadianos(anguloGraus);
}

function cordaCalculada(raio: number, anguloGraus: number): number {
  return 2 * raio * Math.sin(grausParaRadianos(anguloGraus) / 2);
}

// ======================================================
// 4. IDENTIFICAÇÃO DO TIPO DE DESCRIÇÃO
// ======================================================

export function identificarTipoDescricao(
  dados: ResultadoExtracao
): TipoDescricao {
  return dados.formatoDescricao;
}

// ======================================================
// 5. VALIDAÇÃO DE COORDENADAS
// ======================================================

function validarCoordenadas(
  coordenadas: Coordenada[],
  diagnosticos: DiagnosticoGeometria[]
): void {
  if (coordenadas.length === 0) {
    diagnosticos.push({
      tipo: "coordenada_ausente",
      severidade: "aviso",
      mensagem: "Nenhuma coordenada foi encontrada na matrícula.",
    });
    return;
  }

  for (const coordenada of coordenadas) {
    if (
      !Number.isFinite(coordenada.norte) ||
      !Number.isFinite(coordenada.este)
    ) {
      diagnosticos.push({
        tipo: "coordenada_invalida",
        severidade: "erro",
        mensagem: `A coordenada do vértice ${coordenada.vertice} possui valores inválidos.`,
        vertices: [coordenada.vertice],
        valores: {
          norte: String(coordenada.norte),
          este: String(coordenada.este),
        },
      });
    }
  }

  // Verifica vértices consecutivos imediatos com a mesma posição (duplicação errônea de leitura)
  for (let i = 1; i < coordenadas.length; i++) {
    const anterior = coordenadas[i - 1];
    const atual = coordenadas[i];

    if (
      !Number.isFinite(anterior.norte) ||
      !Number.isFinite(anterior.este) ||
      !Number.isFinite(atual.norte) ||
      !Number.isFinite(atual.este)
    ) {
      continue;
    }

    const distancia = distanciaEntrePontos(anterior, atual);

    // Se dois pontos adjacentes no array são idênticos na posição
    // (não confundir com o primeiro e o último do fechamento, que não são adjacentes em polígonos >= 3)
    if (distancia < 0.001) {
      diagnosticos.push({
        tipo: "coordenada_duplicada",
        severidade: "aviso",
        mensagem: `Os vértices consecutivos ${anterior.vertice} e ${atual.vertice} possuem a mesma posição geográfica.`,
        vertices: [anterior.vertice, atual.vertice],
        valores: { distancia },
      });
    }
  }
}

// ======================================================
// 6. LOCALIZAÇÃO DOS SEGMENTOS
// ======================================================

function encontrarParCoordenadas(
  coordenadas: Coordenada[],
  segmento: Segmento
): { origemIdx: number; destinoIdx: number } | null {
  if (segmento.origem) {
    // Busca em sequência o par origem -> destino
    for (let i = 0; i < coordenadas.length - 1; i++) {
      if (
        coordenadas[i].vertice === segmento.origem &&
        coordenadas[i + 1].vertice === segmento.destino
      ) {
        return { origemIdx: i, destinoIdx: i + 1 };
      }
    }
  }

  // Fallback: procura pelo destino
  for (let i = 1; i < coordenadas.length; i++) {
    if (coordenadas[i].vertice === segmento.destino) {
      return { origemIdx: i - 1, destinoIdx: i };
    }
  }

  return null;
}

// ======================================================
// 7. VALIDAÇÃO DE SEGMENTOS RETOS
// ======================================================

function validarSegmentoReto(
  segmento: Segmento,
  coordenadas: Coordenada[],
  tolerancia: number,
  diagnosticos: DiagnosticoGeometria[]
): void {
  if (
    segmento.distancia === undefined ||
    !Number.isFinite(segmento.distancia) ||
    segmento.distancia < 0
  ) {
    diagnosticos.push({
      tipo: "dados_insuficientes",
      severidade: "aviso",
      mensagem: `O segmento até ${segmento.destino} não possui distância válida.`,
      vertices: [segmento.destino],
    });
    return;
  }

  const par = encontrarParCoordenadas(coordenadas, segmento);

  if (!par) {
    diagnosticos.push({
      tipo: "coordenada_ausente",
      severidade: "aviso",
      mensagem: `Não foi possível localizar as coordenadas dos extremos do segmento ${segmento.origem ?? "?"} → ${segmento.destino}.`,
      vertices: [segmento.destino],
    });
    return;
  }

  const origem = coordenadas[par.origemIdx];
  const destino = coordenadas[par.destinoIdx];

  const calculada = distanciaEntrePontos(origem, destino);
  const diferenca = Math.abs(calculada - segmento.distancia);

  if (diferenca > tolerancia) {
    diagnosticos.push({
      tipo: "distancia_divergente",
      severidade: "aviso",
      mensagem: `A distância declarada no segmento ${origem.vertice} → ${destino.vertice} (${segmento.distancia.toFixed(2)}m) diverge da calculada (${calculada.toFixed(2)}m).`,
      vertices: [origem.vertice, destino.vertice],
      valores: {
        distanciaDeclarada: segmento.distancia,
        distanciaCalculada: Number(calculada.toFixed(4)),
        diferenca: Number(diferenca.toFixed(4)),
      },
    });
  }
}

// ======================================================
// 8. VALIDAÇÃO DE CURVAS
// ======================================================

function validarCurva(
  segmento: Segmento,
  coordenadas: Coordenada[],
  tolerancia: number,
  diagnosticos: DiagnosticoGeometria[]
): void {
  const { raio, desenvolvimento, anguloCentral } = segmento;

  if (
    raio === undefined ||
    desenvolvimento === undefined ||
    !anguloCentral ||
    !Number.isFinite(raio) ||
    !Number.isFinite(desenvolvimento) ||
    raio <= 0 ||
    desenvolvimento < 0
  ) {
    diagnosticos.push({
      tipo: "dados_insuficientes",
      severidade: "aviso",
      mensagem: `A curva até ${segmento.destino} possui dados insuficientes ou inválidos (raio, desenvolvimento ou ângulo).`,
      vertices: [segmento.destino],
    });
    return;
  }

  const valoresAngulo = [
    anguloCentral.graus,
    anguloCentral.minutos,
    anguloCentral.segundos,
  ];

  if (
    !valoresAngulo.every(Number.isFinite) ||
    anguloCentral.graus < 0 ||
    anguloCentral.graus > 360 ||
    anguloCentral.minutos < 0 ||
    anguloCentral.minutos >= 60 ||
    anguloCentral.segundos < 0 ||
    anguloCentral.segundos >= 60
  ) {
    diagnosticos.push({
      tipo: "dados_insuficientes",
      severidade: "aviso",
      mensagem: `O ângulo central da curva até ${segmento.destino} possui valores fora do intervalo válido.`,
      vertices: [segmento.destino],
    });
    return;
  }

  const angulo = anguloEmGraus(anguloCentral);

  if (angulo <= 0 || angulo > 360) {
    diagnosticos.push({
      tipo: "dados_insuficientes",
      severidade: "aviso",
      mensagem: `O ângulo central da curva até ${segmento.destino} está fora do intervalo permitido.`,
      vertices: [segmento.destino],
    });
    return;
  }

  // 1. Desenvolvimento declarado vs desenvolvimento calculado: D = R * theta
  const calculado = desenvolvimentoCalculado(raio, angulo);
  const diferenca = Math.abs(desenvolvimento - calculado);

  if (diferenca > tolerancia) {
    diagnosticos.push({
      tipo: "curva_divergente",
      severidade: "aviso",
      mensagem: `O desenvolvimento declarado da curva até ${segmento.destino} (${desenvolvimento.toFixed(2)}m) diverge do valor calculado pelo raio e ângulo (${calculado.toFixed(2)}m).`,
      vertices: [segmento.destino],
      valores: {
        desenvolvimentoDeclarado: desenvolvimento,
        desenvolvimentoCalculado: Number(calculado.toFixed(4)),
        raio,
        anguloCentralGraus: Number(angulo.toFixed(6)),
        diferenca: Number(diferenca.toFixed(4)),
      },
    });
  }

  // 2. Corda da curva vs distância entre coordenadas dos extremos
  const par = encontrarParCoordenadas(coordenadas, segmento);

  if (!par) {
    diagnosticos.push({
      tipo: "coordenada_ausente",
      severidade: "aviso",
      mensagem: `Não foi possível conferir a corda da curva até ${segmento.destino}, pois faltam coordenadas dos extremos.`,
      vertices: [segmento.destino],
    });
    return;
  }

  const origem = coordenadas[par.origemIdx];
  const destino = coordenadas[par.destinoIdx];

  const cordaDeclarada = distanciaEntrePontos(origem, destino);
  const cordaEsperada = cordaCalculada(raio, angulo);
  const diferencaCorda = Math.abs(cordaDeclarada - cordaEsperada);

  if (diferencaCorda > tolerancia) {
    diagnosticos.push({
      tipo: "corda_divergente",
      severidade: "aviso",
      mensagem: `A distância entre coordenadas dos extremos da curva ${origem.vertice} → ${destino.vertice} (${cordaDeclarada.toFixed(2)}m) diverge da corda calculada (${cordaEsperada.toFixed(2)}m).`,
      vertices: [origem.vertice, destino.vertice],
      valores: {
        cordaEntreCoordenadas: Number(cordaDeclarada.toFixed(4)),
        cordaCalculada: Number(cordaEsperada.toFixed(4)),
        diferenca: Number(diferencaCorda.toFixed(4)),
      },
    });
  }
}

// ======================================================
// 9. VALIDAÇÃO DO FECHAMENTO DO PERÍMETRO
// ======================================================

function validarFechamento(
  coordenadas: Coordenada[],
  tolerancia: number,
  diagnosticos: DiagnosticoGeometria[]
): void {
  if (coordenadas.length < 3) return;

  const primeiro = coordenadas[0];
  const ultimo = coordenadas[coordenadas.length - 1];

  // Se o memorial tem repetição do vértice inicial no final (ex: 04-C no início e 04-C no fim)
  const fechaNoMesmoVertice = primeiro.vertice === ultimo.vertice;

  if (fechaNoMesmoVertice) {
    const distancia = distanciaEntrePontos(primeiro, ultimo);
    if (distancia > tolerancia) {
      diagnosticos.push({
        tipo: "perimetro_aberto",
        severidade: "aviso",
        mensagem: `O ponto final coincide no nome (${ultimo.vertice}), mas suas coordenadas divergem do inicial por ${distancia.toFixed(4)}m (tolerância: ${tolerancia}m).`,
        vertices: [primeiro.vertice, ultimo.vertice],
        valores: {
          distanciaFechamento: Number(distancia.toFixed(4)),
          tolerancia,
        },
      });
    }
  } else {
    // Se não fecha no mesmo nome de vértice, registrar aviso informativo
    const distancia = distanciaEntrePontos(primeiro, ultimo);
    diagnosticos.push({
      tipo: "perimetro_aberto",
      severidade: distancia > tolerancia ? "aviso" : "informacao",
      mensagem: `O último vértice (${ultimo.vertice}) não repete explicitamente o inicial (${primeiro.vertice}). Distância de fechamento: ${distancia.toFixed(2)}m.`,
      vertices: [primeiro.vertice, ultimo.vertice],
      valores: {
        distanciaFechamento: Number(distancia.toFixed(4)),
      },
    });
  }
}

// ======================================================
// 10. VALIDAÇÃO DE MEDIDAS CONVENCIONAIS
// ======================================================

function validarMedidasConvencionais(
  dados: ResultadoExtracao,
  diagnosticos: DiagnosticoGeometria[]
): void {
  if (dados.medidas.length === 0) return;

  for (const medida of dados.medidas) {
    if (!Number.isFinite(medida.valor) || medida.valor <= 0) {
      diagnosticos.push({
        tipo: "medida_invalida",
        severidade: "erro",
        mensagem: `A medida de "${medida.descricao}" possui valor nulo ou negativo (${medida.valor}m).`,
        valores: {
          descricao: medida.descricao,
          valor: medida.valor,
          original: medida.original,
        },
      });
    }
  }

  // Verificar descrições duplicadas
  const contagemPorDescricao = new Map<string, number>();
  for (const medida of dados.medidas) {
    const count = contagemPorDescricao.get(medida.descricao) ?? 0;
    contagemPorDescricao.set(medida.descricao, count + 1);
  }

  for (const [descricao, count] of contagemPorDescricao) {
    if (count > 1) {
      diagnosticos.push({
        tipo: "medida_duplicada",
        severidade: "aviso",
        mensagem: `A medida "${descricao}" aparece ${count} vezes no documento.`,
        valores: { descricao, ocorrencias: count },
      });
    }
  }
}

// ======================================================
// 11. VALIDAÇÃO DE COERÊNCIA ENTRE VÉRTICES E SEGMENTOS
// ======================================================

function validarCoerenciaSegmentos(
  dados: ResultadoExtracao,
  diagnosticos: DiagnosticoGeometria[]
): void {
  const coordenadas = dados.coordenadas;
  const segmentos = dados.segmentos;

  if (coordenadas.length < 2 || segmentos.length === 0) return;

  const primeiro = coordenadas[0];
  const ultimo = coordenadas[coordenadas.length - 1];
  const repeticaoFinal = primeiro.vertice === ultimo.vertice;

  const verticesUnicos = repeticaoFinal
    ? coordenadas.length - 1
    : coordenadas.length;

  if (segmentos.length < verticesUnicos) {
    diagnosticos.push({
      tipo: "segmento_ausente",
      severidade: "aviso",
      mensagem: `Foram encontrados ${segmentos.length} segmentos, mas existem ${verticesUnicos} vértices únicos no memorial. Possível segmento não reconhecido pelo OCR.`,
      valores: {
        segmentosEncontrados: segmentos.length,
        segmentosEsperados: verticesUnicos,
      },
    });
  }
}

// ======================================================
// 12. DETERMINAÇÃO DE PERMISSÃO DE GERAÇÃO DXF
// ======================================================

function determinarPermissaoDXF(
  tipo: TipoDescricao,
  coordenadas: Coordenada[],
  medidas: { valor: number }[],
  _erros: number
): boolean {
  if (tipo === "georreferenciada" || tipo === "mista") {
    const coordenadasValidas = coordenadas.filter(
      (c) => Number.isFinite(c.norte) && Number.isFinite(c.este)
    );
    return coordenadasValidas.length >= 3;
  }

  if (tipo === "convencional") {
    const medidasValidas = medidas.filter(
      (m) => Number.isFinite(m.valor) && m.valor > 0
    );
    return medidasValidas.length >= 2;
  }

  return false;
}

// ======================================================
// 13. FUNÇÃO PRINCIPAL
// ======================================================

export function validarGeometria(
  dados: ResultadoExtracao,
  opcoes: OpcoesValidacao = {}
): ResultadoValidacao {
  const toleranciaDistancia =
    opcoes.toleranciaDistancia ?? TOLERANCIAS_PADRAO.toleranciaDistancia;
  const toleranciaCurva =
    opcoes.toleranciaCurva ?? TOLERANCIAS_PADRAO.toleranciaCurva;
  const toleranciaFechamento =
    opcoes.toleranciaFechamento ?? TOLERANCIAS_PADRAO.toleranciaFechamento;

  const diagnosticos: DiagnosticoGeometria[] = [];

  const coordenadas = dados.coordenadas ?? [];
  const segmentos = dados.segmentos ?? [];
  const tipoDescricao = identificarTipoDescricao(dados);

  // Registro do formato identificado
  diagnosticos.push({
    tipo: "formato_identificado",
    severidade: "informacao",
    mensagem: `Formato de descrição imobiliária: ${tipoDescricao}.`,
    valores: {
      formato: tipoDescricao,
      totalCoordenadas: coordenadas.length,
      totalSegmentos: segmentos.length,
      totalMedidas: dados.medidas.length,
    },
  });

  if (tipoDescricao === "insuficiente") {
    diagnosticos.push({
      tipo: "dados_insuficientes",
      severidade: "aviso",
      mensagem: "Não foram encontradas coordenadas ou medidas suficientes para análise geométrica.",
    });
  }

  // Valida coordenadas se presentes
  if (coordenadas.length > 0) {
    validarCoordenadas(coordenadas, diagnosticos);
    validarFechamento(coordenadas, toleranciaFechamento, diagnosticos);
  }

  // Valida cada segmento
  for (const segmento of segmentos) {
    if (segmento.geometria === "reta") {
      validarSegmentoReto(segmento, coordenadas, toleranciaDistancia, diagnosticos);
    } else if (segmento.geometria === "curva") {
      validarCurva(segmento, coordenadas, toleranciaCurva, diagnosticos);
    }
  }

  // Coerência entre quantidade de segmentos e vértices
  validarCoerenciaSegmentos(dados, diagnosticos);

  // Valida medidas convencionais
  validarMedidasConvencionais(dados, diagnosticos);

  const erros = diagnosticos.filter((d) => d.severidade === "erro").length;
  const avisos = diagnosticos.filter((d) => d.severidade === "aviso").length;
  const informacoes = diagnosticos.filter((d) => d.severidade === "informacao").length;

  const permiteGeracaoDXF = determinarPermissaoDXF(
    tipoDescricao,
    coordenadas,
    dados.medidas,
    erros
  );

  const dxfAproximado =
    tipoDescricao === "convencional" ||
    tipoDescricao === "mista" ||
    avisos > 0;

  return {
    tipoDescricao,
    diagnosticos,
    resumo: {
      total: diagnosticos.length,
      erros,
      avisos,
      informacoes,
      possuiDivergencias: erros > 0 || avisos > 0,
      permiteGeracaoDXF,
      dxfAproximado,
    },
  };
}
