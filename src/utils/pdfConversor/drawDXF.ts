// src/utils/drawDXF.ts

import type { DxfWriter, LWPolylineVertex } from "@tarikjabiri/dxf";

import type { Coordenada, Segmento, ResultadoExtracao } from "./textSanitizer";

import type { ResultadoValidacao } from "./validarGeometria";

// ======================================================
// 1. TIPOS
// ======================================================

type DxfModule = typeof import("@tarikjabiri/dxf");

export interface OpcoesGeracaoDXF {
  incluirVertices?: boolean;
  incluirIdentificacao?: boolean;
  incluirMedidas?: boolean;
  incluirAzimutes?: boolean;
  incluirConfrontacoes?: boolean;
  alturaTexto?: number;
  nomeArquivo?: string;
}

export interface ItemTerrenoDXF {
  id: string;
  titulo: string;
  dados: ResultadoExtracao;
  validacao: ResultadoValidacao;
}

export interface ResultadoGeracaoDXF {
  sucesso: boolean;
  mensagem: string;
  aproximado: boolean;
  avisos: string[];
}

// ======================================================
// 2. CONSTANTES
// ======================================================

let dxfPromise: Promise<DxfModule> | null = null;

const CAMADAS = {
  CONTORNO: "CONTORNO",
  CURVAS: "CURVAS",
  VERTICES: "VERTICES",
  IDENTIFICACAO: "IDENTIFICACAO",
  MEDIDAS: "MEDIDAS",
  AZIMUTES: "AZIMUTES",
  CONFRONTACOES: "CONFRONTACOES",
  INFO: "INFORMACOES",
} as const;

const OPCOES_PADRAO: Required<OpcoesGeracaoDXF> = {
  incluirVertices: true,
  incluirIdentificacao: true,
  incluirMedidas: true,
  incluirAzimutes: true,
  incluirConfrontacoes: true,
  alturaTexto: 0,
  nomeArquivo: "terreno.dxf",
};

function getDxfLib() {
  if (!dxfPromise) dxfPromise = import("@tarikjabiri/dxf");
  return dxfPromise;
}

function getColors(Colors: DxfModule["Colors"]) {
  return {
    CONTORNO: Colors.White,
    CURVAS: Colors.Magenta,
    VERTICES: Colors.Red,
    IDENTIFICACAO: Colors.Green,
    MEDIDAS: Colors.Cyan,
    AZIMUTES: Colors.Yellow,
    CONFRONTACOES: Colors.Blue,
    INFO: 8, // Cinza
  } as const;
}

// ======================================================
// 3. MATEMÁTICA PARA ARCOS DXF
// ======================================================

function radianosParaGraus(radianos: number): number {
  return (radianos * 180) / Math.PI;
}

function normalizarGraus(graus: number): number {
  let g = graus % 360;
  if (g < 0) g += 360;
  return g;
}

/**
 * Calcula os parâmetros de um arco DXF a partir dos dois extremos, raio e sentido de deflexão.
 * No DXF, os arcos são desenhados sempre em sentido anti-horário do startAngle até o endAngle.
 */
function calcularArcoDXF(
  origemE: number,
  origemN: number,
  destinoE: number,
  destinoN: number,
  raio: number,
  deflexao: "direita" | "esquerda" = "direita",
): {
  centroX: number;
  centroY: number;
  startAngle: number;
  endAngle: number;
} | null {
  const dx = destinoE - origemE;
  const dy = destinoN - origemN;
  const corda = Math.hypot(dx, dy);

  // Corda não pode exceder o diâmetro da circunferência
  if (corda > 2 * raio + 0.1 || corda < 0.001) {
    return null;
  }

  // Ponto médio da corda
  const mx = (origemE + destinoE) / 2;
  const my = (origemN + destinoN) / 2;

  // Distância do centro ao ponto médio
  const h = Math.sqrt(Math.max(raio * raio - Math.pow(corda / 2, 2), 0));

  // Vetor perpendicular unitário à corda
  // Vetor percurso: (dx/corda, dy/corda)
  // Normal à direita: (dy/corda, -dx/corda)
  // Normal à esquerda: (-dy/corda, dx/corda)
  let nx: number;
  let ny: number;

  if (deflexao === "direita") {
    // Centro fica à direita do percurso
    nx = dy / corda;
    ny = -dx / corda;
  } else {
    // Centro fica à esquerda do percurso
    nx = -dy / corda;
    ny = dx / corda;
  }

  const centroX = mx + h * nx;
  const centroY = my + h * ny;

  // Ângulo do centro para origem e centro para destino
  const angOrigem = normalizarGraus(
    radianosParaGraus(Math.atan2(origemN - centroY, origemE - centroX)),
  );
  const angDestino = normalizarGraus(
    radianosParaGraus(Math.atan2(destinoN - centroY, destinoE - centroX)),
  );

  let startAngle: number;
  let endAngle: number;

  if (deflexao === "direita") {
    // Percurso é horário (Origem -> Destino).
    // No DXF (anti-horário), o arco vai de Destino para Origem.
    startAngle = angDestino;
    endAngle = angOrigem;
  } else {
    // Percurso é anti-horário (Origem -> Destino).
    startAngle = angOrigem;
    endAngle = angDestino;
  }

  return { centroX, centroY, startAngle, endAngle };
}

function calcularAlturaTexto(pontos: Coordenada[]): number {
  if (pontos.length < 2) return 1;

  const minE = Math.min(...pontos.map((p) => p.este));
  const maxE = Math.max(...pontos.map((p) => p.este));
  const minN = Math.min(...pontos.map((p) => p.norte));
  const maxN = Math.max(...pontos.map((p) => p.norte));

  const extensao = Math.max(maxE - minE, maxN - minN);
  return Math.max(extensao * 0.015, 0.5);
}

// ======================================================
// 4. GERAÇÃO DXF — TERRENO GEORREFERENCIADO
// ======================================================

async function gerarDXFGeorreferenciado(
  dxf: DxfWriter,
  dados: ResultadoExtracao,
  opcoes: Required<OpcoesGeracaoDXF>,
  avisos: string[],
  prefixoCamada: string = "",
  tituloTerreno?: string,
): Promise<void> {
  const { point3d } = await getDxfLib();

  const coordenadas = dados.coordenadas;

  const cContorno = `${prefixoCamada}${CAMADAS.CONTORNO}`;
  const cCurvas = `${prefixoCamada}${CAMADAS.CURVAS}`;
  const cVertices = `${prefixoCamada}${CAMADAS.VERTICES}`;
  const cIdentificacao = `${prefixoCamada}${CAMADAS.IDENTIFICACAO}`;
  const cMedidas = `${prefixoCamada}${CAMADAS.MEDIDAS}`;
  const cAzimutes = `${prefixoCamada}${CAMADAS.AZIMUTES}`;
  const cInfo = `${prefixoCamada}${CAMADAS.INFO}`;

  if (coordenadas.length < 3) {
    throw new Error(
      "Coordenadas insuficientes para gerar o terreno (mínimo 3).",
    );
  }

  const pontos = [...coordenadas];
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];

  // Se o último ponto repete o primeiro, mantemos uma lista sem o ponto duplicado para desenhar vértices
  const repetePrimeiro =
    primeiro.vertice === ultimo.vertice ||
    Math.hypot(primeiro.este - ultimo.este, primeiro.norte - ultimo.norte) <
      0.05;

  const pontosVertices = repetePrimeiro ? pontos.slice(0, -1) : pontos;
  const alturaTexto =
    opcoes.alturaTexto > 0
      ? opcoes.alturaTexto
      : calcularAlturaTexto(pontosVertices);

  // Mapeamento dos segmentos por origem -> destino para rápida consulta
  const segmentosMap = new Map<string, Segmento>();
  for (const seg of dados.segmentos) {
    if (seg.origem && seg.destino) {
      segmentosMap.set(`${seg.origem}→${seg.destino}`, seg);
    }
  }

  // Desenha os trechos do perímetro conectando os pontos consecutivos
  const totalConexoes = repetePrimeiro ? pontos.length - 1 : pontos.length;

  for (let i = 0; i < totalConexoes; i++) {
    const p1 = pontos[i];
    const p2 = i + 1 < pontos.length ? pontos[i + 1] : pontos[0];

    const chave = `${p1.vertice}→${p2.vertice}`;
    const seg = segmentosMap.get(chave) ?? dados.segmentos[i];

    if (seg && seg.geometria === "curva" && seg.raio && seg.raio > 0) {
      // Trecho em curva
      dxf.setCurrentLayerName(cCurvas);
      const arco = calcularArcoDXF(
        p1.este,
        p1.norte,
        p2.este,
        p2.norte,
        seg.raio,
        seg.deflexao ?? "direita",
      );

      if (arco) {
        dxf.addArc(
          point3d(arco.centroX, arco.centroY, 0),
          seg.raio,
          arco.startAngle,
          arco.endAngle,
          { layerName: cCurvas },
        );
      } else {
        dxf.addLine(
          point3d(p1.este, p1.norte, 0),
          point3d(p2.este, p2.norte, 0),
          { layerName: cCurvas },
        );
        avisos.push(
          `Curva ${p1.vertice} → ${p2.vertice}: geometria incompatível com arco esférico (corda maior que diâmetro). Representada como segmento reto na camada ${cCurvas}.`,
        );
      }
    } else {
      // Trecho reto
      dxf.setCurrentLayerName(cContorno);
      dxf.addLine(
        point3d(p1.este, p1.norte, 0),
        point3d(p2.este, p2.norte, 0),
        { layerName: cContorno },
      );
    }
  }

  // Camada VÉRTICES: marcação física dos pontos com 'X'
  if (opcoes.incluirVertices) {
    dxf.setCurrentLayerName(cVertices);
    const tamX = alturaTexto * 0.35;

    for (const ponto of pontosVertices) {
      dxf.addPoint(ponto.este, ponto.norte, 0, {
        layerName: cVertices,
      });

      dxf.addLine(
        point3d(ponto.este - tamX, ponto.norte - tamX, 0),
        point3d(ponto.este + tamX, ponto.norte + tamX, 0),
        { layerName: cVertices },
      );
      dxf.addLine(
        point3d(ponto.este + tamX, ponto.norte - tamX, 0),
        point3d(ponto.este - tamX, ponto.norte + tamX, 0),
        { layerName: cVertices },
      );
    }
  }

  // Camada IDENTIFICAÇÃO: rótulo com nome de cada vértice
  if (opcoes.incluirIdentificacao) {
    dxf.setCurrentLayerName(cIdentificacao);

    for (const ponto of pontosVertices) {
      dxf.addText(
        point3d(
          ponto.este + alturaTexto * 0.5,
          ponto.norte + alturaTexto * 0.5,
          0,
        ),
        alturaTexto,
        ponto.vertice,
        { layerName: cIdentificacao },
      );
    }
  }

  // Camada MEDIDAS: distâncias nos segmentos
  if (opcoes.incluirMedidas) {
    dxf.setCurrentLayerName(cMedidas);

    for (let i = 0; i < totalConexoes; i++) {
      const p1 = pontos[i];
      const p2 = i + 1 < pontos.length ? pontos[i + 1] : pontos[0];
      const seg =
        segmentosMap.get(`${p1.vertice}→${p2.vertice}`) ?? dados.segmentos[i];

      const valor =
        seg?.distancia ??
        seg?.desenvolvimento ??
        Math.hypot(p2.este - p1.este, p2.norte - p1.norte);
      const texto =
        seg?.geometria === "curva"
          ? `D=${valor.toFixed(2)}m`
          : `${valor.toFixed(2)}m`;

      const mx = (p1.este + p2.este) / 2;
      const my = (p1.norte + p2.norte) / 2;

      const angRad = Math.atan2(p2.norte - p1.norte, p2.este - p1.este);
      let angDeg = radianosParaGraus(angRad);
      if (angDeg > 90) angDeg -= 180;
      if (angDeg < -90) angDeg += 180;

      const offset = alturaTexto * 0.9;
      const perpX = -Math.sin(angRad) * offset;
      const perpY = Math.cos(angRad) * offset;

      dxf.addText(
        point3d(mx + perpX, my + perpY, 0),
        alturaTexto * 0.7,
        texto,
        {
          layerName: cMedidas,
          rotation: angDeg,
        },
      );
    }
  }

  // Camada AZIMUTES: azimute nos segmentos retos
  if (opcoes.incluirAzimutes) {
    dxf.setCurrentLayerName(cAzimutes);

    for (let i = 0; i < totalConexoes; i++) {
      const p1 = pontos[i];
      const p2 = i + 1 < pontos.length ? pontos[i + 1] : pontos[0];
      const seg =
        segmentosMap.get(`${p1.vertice}→${p2.vertice}`) ?? dados.segmentos[i];

      if (!seg?.azimute) continue;

      const az = seg.azimute;
      const textoAz = `Az ${az.graus}°${az.minutos.toString().padStart(2, "0")}'${az.segundos.toFixed(0).padStart(2, "0")}"`;

      const mx = (p1.este + p2.este) / 2;
      const my = (p1.norte + p2.norte) / 2;

      const angRad = Math.atan2(p2.norte - p1.norte, p2.este - p1.este);
      let angDeg = radianosParaGraus(angRad);
      if (angDeg > 90) angDeg -= 180;
      if (angDeg < -90) angDeg += 180;

      const offset = -alturaTexto * 1.5;
      const perpX = -Math.sin(angRad) * offset;
      const perpY = Math.cos(angRad) * offset;

      dxf.addText(
        point3d(mx + perpX, my + perpY, 0),
        alturaTexto * 0.55,
        textoAz,
        {
          layerName: cAzimutes,
          rotation: angDeg,
        },
      );
    }
  }

  // Camada INFORMAÇÕES: quadro resumo no desenho
  dxf.setCurrentLayerName(cInfo);
  const minE = Math.min(...pontosVertices.map((p) => p.este));
  const minN = Math.min(...pontosVertices.map((p) => p.norte));
  const maxN = Math.max(...pontosVertices.map((p) => p.norte));

  if (tituloTerreno) {
    dxf.addText(
      point3d(minE, maxN + alturaTexto * 2.5, 0),
      alturaTexto * 1.3,
      tituloTerreno.toUpperCase(),
      { layerName: cInfo },
    );
  }

  if (dados.areaTotal) {
    dxf.addText(
      point3d(minE, minN - alturaTexto * 3, 0),
      alturaTexto * 1.1,
      `Area total declarada: ${dados.areaTotal.toFixed(2)} m2`,
      { layerName: cInfo },
    );
  }

  dxf.addText(
    point3d(minE, minN - alturaTexto * 5, 0),
    alturaTexto * 0.8,
    `Levantamento perimetrico gerado via LifeTopografia - ${pontosVertices.length} vertices`,
    { layerName: cInfo },
  );
}

// ======================================================
// 5. GERAÇÃO DXF — TERRENO CONVENCIONAL (ESQUEMÁTICO)
// ======================================================

async function gerarDXFConvencional(
  dxf: DxfWriter,
  dados: ResultadoExtracao,
  opcoes: Required<OpcoesGeracaoDXF>,
  avisos: string[],
  prefixoCamada: string = "",
  offsetX: number = 0,
  offsetY: number = 0,
  tituloTerreno?: string,
): Promise<void> {
  const { point2d, point3d, LWPolylineFlags } = await getDxfLib();
  const cContorno = `${prefixoCamada}${CAMADAS.CONTORNO}`;
  const cVertices = `${prefixoCamada}${CAMADAS.VERTICES}`;
  const cIdentificacao = `${prefixoCamada}${CAMADAS.IDENTIFICACAO}`;
  const cMedidas = `${prefixoCamada}${CAMADAS.MEDIDAS}`;
  const cInfo = `${prefixoCamada}${CAMADAS.INFO}`;

  const medidas = dados.medidas;

  if (medidas.length < 2) {
    throw new Error(
      "Medidas insuficientes para gerar a representação gráfica convencional.",
    );
  }

  avisos.push(
    "ATENÇÃO: Desenho ESQUEMÁTICO/APROXIMADO. Medidas convencionais (frente, lados, fundos) não determinam um polígono único sem ângulos ou azimutes. Ângulos assumidos ilustrativamente em 90°.",
  );

  const frente = medidas.find((m) => m.descricao === "frente")?.valor;
  const direito = medidas.find((m) => m.descricao === "lado direito")?.valor;
  const esquerdo = medidas.find((m) => m.descricao === "lado esquerdo")?.valor;
  const fundos = medidas.find((m) => m.descricao === "fundos")?.valor;

  const frenteV = frente ?? fundos ?? 10;
  const ladoD = direito ?? esquerdo ?? 20;
  const ladoE = esquerdo ?? direito ?? 20;
  const fundosV = fundos ?? frente ?? 10;

  // Monta polígono ilustrativo partindo de (offsetX, offsetY)
  const vertices: { x: number; y: number; label: string }[] = [
    { x: offsetX + 0, y: offsetY + 0, label: "P1 (Frente Esq.)" },
    { x: offsetX + frenteV, y: offsetY + 0, label: "P2 (Frente Dir.)" },
    { x: offsetX + frenteV, y: offsetY + ladoD, label: "P3 (Fundos Dir.)" },
    { x: offsetX + 0, y: offsetY + ladoE, label: "P4 (Fundos Esq.)" },
  ];

  if (fundosV !== frenteV) {
    const diff = frenteV - fundosV;
    vertices[2].x = offsetX + frenteV - diff / 2;
    vertices[3].x = offsetX + diff / 2;
  }

  const alturaTexto =
    opcoes.alturaTexto > 0
      ? opcoes.alturaTexto
      : Math.max(frenteV, ladoD, ladoE) * 0.025;

  if (tituloTerreno) {
    dxf.setCurrentLayerName(cInfo);
    dxf.addText(
      point3d(offsetX, offsetY + Math.max(ladoD, ladoE) + alturaTexto * 3, 0),
      alturaTexto * 1.3,
      tituloTerreno.toUpperCase(),
      { layerName: cInfo },
    );
  }

  // Contorno
  dxf.setCurrentLayerName(cContorno);
  const lwVertices: LWPolylineVertex[] = vertices.map((v) => ({
    point: point2d(v.x, v.y),
  }));

  dxf.addLWPolyline(lwVertices, {
    flags: LWPolylineFlags.Closed,
    layerName: cContorno,
  });

  // Vértices
  if (opcoes.incluirVertices) {
    dxf.setCurrentLayerName(cVertices);
    for (const v of vertices) {
      dxf.addPoint(v.x, v.y, 0, { layerName: cVertices });
    }
  }

  // Identificação
  if (opcoes.incluirIdentificacao) {
    dxf.setCurrentLayerName(cIdentificacao);
    for (const v of vertices) {
      dxf.addText(
        point3d(v.x + alturaTexto * 0.5, v.y + alturaTexto * 0.5, 0),
        alturaTexto,
        v.label,
        { layerName: cIdentificacao },
      );
    }
  }

  // Medidas
  if (opcoes.incluirMedidas) {
    dxf.setCurrentLayerName(cMedidas);
    const lados = [
      {
        p1: vertices[0],
        p2: vertices[1],
        texto: `Frente: ${frenteV.toFixed(2)}m`,
      },
      {
        p1: vertices[1],
        p2: vertices[2],
        texto: `Lado Dir.: ${ladoD.toFixed(2)}m`,
      },
      {
        p1: vertices[2],
        p2: vertices[3],
        texto: `Fundos: ${fundosV.toFixed(2)}m`,
      },
      {
        p1: vertices[3],
        p2: vertices[0],
        texto: `Lado Esq.: ${ladoE.toFixed(2)}m`,
      },
    ];

    for (const lado of lados) {
      const mx = (lado.p1.x + lado.p2.x) / 2;
      const my = (lado.p1.y + lado.p2.y) / 2;

      const angRad = Math.atan2(lado.p2.y - lado.p1.y, lado.p2.x - lado.p1.x);
      let angDeg = radianosParaGraus(angRad);
      if (angDeg > 90) angDeg -= 180;
      if (angDeg < -90) angDeg += 180;

      const offset = alturaTexto * 1.2;
      const perpX = -Math.sin(angRad) * offset;
      const perpY = Math.cos(angRad) * offset;

      dxf.addText(
        point3d(mx + perpX, my + perpY, 0),
        alturaTexto * 0.8,
        lado.texto,
        {
          layerName: cMedidas,
          rotation: angDeg,
        },
      );
    }
  }

  // Notas esquemáticas
  dxf.setCurrentLayerName(cInfo);

  dxf.addText(
    point3d(offsetX, offsetY - alturaTexto * 4, 0),
    alturaTexto * 1.1,
    "*** REPRESENTACAO ESQUEMATICA - NAO ESTA EM ESCALA REAL ***",
    { layerName: cInfo },
  );

  dxf.addText(
    point3d(offsetX, offsetY - alturaTexto * 6.5, 0),
    alturaTexto * 0.75,
    "Angulos assumidos a 90 graus. O perimetro real depende de levantamento topografico in loco.",
    { layerName: cInfo },
  );
}

// ======================================================
// 6. FUNÇÃO PRINCIPAL
// ======================================================

export async function gerarDXF(
  dados: ResultadoExtracao,
  validacao: ResultadoValidacao,
  opcoes: OpcoesGeracaoDXF = {},
): Promise<ResultadoGeracaoDXF> {
  const { DxfWriter, Units, Colors } = await getDxfLib();
  const CORES = getColors(Colors);

  const opcoesCompletas: Required<OpcoesGeracaoDXF> = {
    ...OPCOES_PADRAO,
    ...opcoes,
  };

  const avisos: string[] = [];

  if (!validacao.resumo.permiteGeracaoDXF) {
    return {
      sucesso: false,
      mensagem:
        "Dados insuficientes para gerar o DXF. Consulte os diagnósticos da validação.",
      aproximado: false,
      avisos: [],
    };
  }

  try {
    const dxf = new DxfWriter();
    dxf.setUnits(Units.Meters);

    // Registra camadas
    dxf.addLayer(CAMADAS.CONTORNO, CORES.CONTORNO, "Continuous");
    dxf.addLayer(CAMADAS.CURVAS, CORES.CURVAS, "Continuous");
    dxf.addLayer(CAMADAS.VERTICES, CORES.VERTICES, "Continuous");
    dxf.addLayer(CAMADAS.IDENTIFICACAO, CORES.IDENTIFICACAO, "Continuous");
    dxf.addLayer(CAMADAS.MEDIDAS, CORES.MEDIDAS, "Continuous");
    dxf.addLayer(CAMADAS.AZIMUTES, CORES.AZIMUTES, "Continuous");
    dxf.addLayer(CAMADAS.CONFRONTACOES, CORES.CONFRONTACOES, "Continuous");
    dxf.addLayer(CAMADAS.INFO, CORES.INFO, "Continuous");

    const tipo = validacao.tipoDescricao;

    if (tipo === "georreferenciada" || tipo === "mista") {
      await gerarDXFGeorreferenciado(dxf, dados, opcoesCompletas, avisos);
    } else if (tipo === "convencional") {
      gerarDXFConvencional(dxf, dados, opcoesCompletas, avisos);
    } else {
      return {
        sucesso: false,
        mensagem:
          "Formato de descrição insuficiente para reconstrução gráfica.",
        aproximado: false,
        avisos: [],
      };
    }

    if (validacao.resumo.possuiDivergencias) {
      avisos.push(
        `O memorial possui divergências registradas (${validacao.resumo.avisos} aviso(s), ${validacao.resumo.erros} erro(s)).`,
      );
    }

    // Gera o arquivo e aciona o download no navegador se estiver em ambiente browser
    const conteudo = dxf.stringify();

    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const blob = new Blob([conteudo], {
        type: "application/dxf",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = opcoesCompletas.nomeArquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    return {
      sucesso: true,
      mensagem: validacao.resumo.dxfAproximado
        ? "DXF gerado com ressalvas/aproximações. Verifique os avisos."
        : "Arquivo DXF gerado e baixado com sucesso.",
      aproximado: validacao.resumo.dxfAproximado,
      avisos,
    };
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Erro desconhecido";
    return {
      sucesso: false,
      mensagem: `Falha na geração do DXF: ${mensagem}`,
      aproximado: false,
      avisos,
    };
  }
}

/**
 * Retorna o conteúdo DXF como string pura (útil para testes unitários ou backend)
 */
export async function gerarDXFString(
  dados: ResultadoExtracao,
  validacao: ResultadoValidacao,
  opcoes: OpcoesGeracaoDXF = {},
): Promise<{ stringDxf: string; avisos: string[] }> {
  const { DxfWriter, Units, Colors } = await getDxfLib();
  const CORES = getColors(Colors);
  const opcoesCompletas: Required<OpcoesGeracaoDXF> = {
    ...OPCOES_PADRAO,
    ...opcoes,
  };

  const avisos: string[] = [];
  const dxf = new DxfWriter();
  dxf.setUnits(Units.Meters);

  dxf.addLayer(CAMADAS.CONTORNO, CORES.CONTORNO, "Continuous");
  dxf.addLayer(CAMADAS.CURVAS, CORES.CURVAS, "Continuous");
  dxf.addLayer(CAMADAS.VERTICES, CORES.VERTICES, "Continuous");
  dxf.addLayer(CAMADAS.IDENTIFICACAO, CORES.IDENTIFICACAO, "Continuous");
  dxf.addLayer(CAMADAS.MEDIDAS, CORES.MEDIDAS, "Continuous");
  dxf.addLayer(CAMADAS.AZIMUTES, CORES.AZIMUTES, "Continuous");
  dxf.addLayer(CAMADAS.CONFRONTACOES, CORES.CONFRONTACOES, "Continuous");
  dxf.addLayer(CAMADAS.INFO, CORES.INFO, "Continuous");

  const tipo = validacao.tipoDescricao;
  if (tipo === "georreferenciada" || tipo === "mista") {
    await gerarDXFGeorreferenciado(dxf, dados, opcoesCompletas, avisos);
  } else if (tipo === "convencional") {
    await gerarDXFConvencional(dxf, dados, opcoesCompletas, avisos);
  }

  return {
    stringDxf: dxf.stringify(),
    avisos,
  };
}

// ======================================================
// 7. GERAÇÃO DXF — MÚLTIPLOS TERRENOS
// ======================================================

export async function gerarDXFMultiplosTerrenos(
  terrenos: ItemTerrenoDXF[],
  opcoes: OpcoesGeracaoDXF = {},
): Promise<ResultadoGeracaoDXF> {
  const { DxfWriter, Units, Colors } = await getDxfLib();
  const CORES = getColors(Colors);
  const opcoesCompletas: Required<OpcoesGeracaoDXF> = {
    ...OPCOES_PADRAO,
    ...opcoes,
  };

  const avisos: string[] = [];
  const terrenosValidos = terrenos.filter(
    (t) => t.validacao.resumo.permiteGeracaoDXF,
  );

  if (terrenosValidos.length === 0) {
    return {
      sucesso: false,
      mensagem:
        "Nenhum dos terrenos identificados possui dados suficientes para gerar DXF.",
      aproximado: false,
      avisos: [],
    };
  }

  try {
    const dxf = new DxfWriter();
    dxf.setUnits(Units.Meters);

    let temAproximado = false;
    let offsetConvencionalX = 0;

    for (let i = 0; i < terrenosValidos.length; i++) {
      const item = terrenosValidos[i];
      const prefixo = `T${i + 1}_`;
      const tit = item.titulo || `Terreno ${i + 1}`;

      // Registra camadas independentes para este terreno
      dxf.addLayer(
        `${prefixo}${CAMADAS.CONTORNO}`,
        CORES.CONTORNO,
        "Continuous",
      );
      dxf.addLayer(`${prefixo}${CAMADAS.CURVAS}`, CORES.CURVAS, "Continuous");
      dxf.addLayer(
        `${prefixo}${CAMADAS.VERTICES}`,
        CORES.VERTICES,
        "Continuous",
      );
      dxf.addLayer(
        `${prefixo}${CAMADAS.IDENTIFICACAO}`,
        CORES.IDENTIFICACAO,
        "Continuous",
      );
      dxf.addLayer(`${prefixo}${CAMADAS.MEDIDAS}`, CORES.MEDIDAS, "Continuous");
      dxf.addLayer(
        `${prefixo}${CAMADAS.AZIMUTES}`,
        CORES.AZIMUTES,
        "Continuous",
      );
      dxf.addLayer(
        `${prefixo}${CAMADAS.CONFRONTACOES}`,
        CORES.CONFRONTACOES,
        "Continuous",
      );
      dxf.addLayer(`${prefixo}${CAMADAS.INFO}`, CORES.INFO, "Continuous");

      if (item.validacao.resumo.dxfAproximado) {
        temAproximado = true;
      }

      if (
        item.validacao.tipoDescricao === "georreferenciada" ||
        item.validacao.tipoDescricao === "mista"
      ) {
        await gerarDXFGeorreferenciado(
          dxf,
          item.dados,
          opcoesCompletas,
          avisos,
          prefixo,
          tit,
        );
      } else if (item.validacao.tipoDescricao === "convencional") {
        await gerarDXFConvencional(
          dxf,
          item.dados,
          opcoesCompletas,
          avisos,
          prefixo,
          offsetConvencionalX,
          0,
          tit,
        );
        const maxMedida = Math.max(
          ...item.dados.medidas.map((m) => m.valor),
          20,
        );
        offsetConvencionalX += maxMedida + 20;
      }
    }

    const conteudo = dxf.stringify();

    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const blob = new Blob([conteudo], { type: "application/dxf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        opcoesCompletas.nomeArquivo.replace(/\.dxf$/i, "") +
        "_todos_terrenos.dxf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    return {
      sucesso: true,
      mensagem: temAproximado
        ? `DXF unificado gerado para ${terrenosValidos.length} terreno(s) com ressalvas/aproximações.`
        : `DXF unificado gerado com sucesso contendo ${terrenosValidos.length} terreno(s) em camadas independentes.`,
      aproximado: temAproximado,
      avisos,
    };
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Erro desconhecido";
    return {
      sucesso: false,
      mensagem: `Falha na geração do DXF combinado: ${mensagem}`,
      aproximado: false,
      avisos,
    };
  }
}

export async function gerarDXFStringMultiplosTerrenos(
  terrenos: ItemTerrenoDXF[],
  opcoes: OpcoesGeracaoDXF = {},
): Promise<{ stringDxf: string; avisos: string[] }> {
  const { DxfWriter, Units, Colors } = await getDxfLib();
  const CORES = getColors(Colors);

  const opcoesCompletas: Required<OpcoesGeracaoDXF> = {
    ...OPCOES_PADRAO,
    ...opcoes,
  };

  const avisos: string[] = [];
  const dxf = new DxfWriter();
  dxf.setUnits(Units.Meters);

  let offsetConvencionalX = 0;

  for (let i = 0; i < terrenos.length; i++) {
    const item = terrenos[i];
    const prefixo = `T${i + 1}_`;
    const tit = item.titulo || `Terreno ${i + 1}`;

    dxf.addLayer(`${prefixo}${CAMADAS.CONTORNO}`, CORES.CONTORNO, "Continuous");
    dxf.addLayer(`${prefixo}${CAMADAS.CURVAS}`, CORES.CURVAS, "Continuous");
    dxf.addLayer(`${prefixo}${CAMADAS.VERTICES}`, CORES.VERTICES, "Continuous");
    dxf.addLayer(
      `${prefixo}${CAMADAS.IDENTIFICACAO}`,
      CORES.IDENTIFICACAO,
      "Continuous",
    );
    dxf.addLayer(`${prefixo}${CAMADAS.MEDIDAS}`, CORES.MEDIDAS, "Continuous");
    dxf.addLayer(`${prefixo}${CAMADAS.AZIMUTES}`, CORES.AZIMUTES, "Continuous");
    dxf.addLayer(
      `${prefixo}${CAMADAS.CONFRONTACOES}`,
      CORES.CONFRONTACOES,
      "Continuous",
    );
    dxf.addLayer(`${prefixo}${CAMADAS.INFO}`, CORES.INFO, "Continuous");

    if (
      item.validacao.tipoDescricao === "georreferenciada" ||
      item.validacao.tipoDescricao === "mista"
    ) {
      await gerarDXFGeorreferenciado(
        dxf,
        item.dados,
        opcoesCompletas,
        avisos,
        prefixo,
        tit,
      );
    } else if (item.validacao.tipoDescricao === "convencional") {
      await gerarDXFConvencional(
        dxf,
        item.dados,
        opcoesCompletas,
        avisos,
        prefixo,
        offsetConvencionalX,
        0,
        tit,
      );
      const maxMedida = Math.max(...item.dados.medidas.map((m) => m.valor), 20);
      offsetConvencionalX += maxMedida + 20;
    }
  }

  return {
    stringDxf: dxf.stringify(),
    avisos,
  };
}
