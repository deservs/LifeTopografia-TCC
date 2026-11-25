// src/utils/matricula.test.ts

import {
  extrairInformacoes,
  separarTerrenos,
  separarTerrenosComResultado,
} from "./textSanitizer";
import { validarGeometria } from "./validarGeometria";
import { gerarDXFString, gerarDXFStringMultiplosTerrenos } from "./drawDXF";
import { normalizarPageRanges } from "./pdfConvert";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("==============================================================");
  console.log("INICIANDO BATERIA DE TESTES DO PROCESSADOR DE MATRÍCULAS E DXF");
  console.log(
    "==============================================================\n",
  );

  // =========================================================================
  // CASO 1: Matrícula Georreferenciada
  // - 7 registros de coordenadas (incluindo repetição do ponto inicial 04-C no fim)
  // - 5 segmentos retos
  // - 1 segmento em curva
  // - Área total de 10.490,13 m²
  // - Ordem preservada dos 6 segmentos
  // =========================================================================
  console.log(
    "TESTE 1: Matrícula Georreferenciada (7 coordenadas, 6 segmentos)",
  );
  const textoCaso1 = `
    MEMORIAL DESCRITIVO DO IMÓVEL
    Inicia-se a descrição deste perímetro no ponto 04-C, de coordenadas N=7.410.242,9289 e E=307.925,7590;
    deste ponto, segue com azimute de 97°20'42" e distância de 118,75 m, confrontando com a Fazenda Primavera, até o ponto 06, de coordenadas N=7.410.227,7425 e E=308.043,5339;
    deste ponto, segue com azimute de 187°37'50" e distância de 36,52 m, confrontando com o Lote 02, até o ponto 05, de coordenadas N=7.410.191,5463 e E=308.038,6864;
    deste ponto, segue com azimute de 187°37'19" e distância de 52,27 m, confrontando com o Lote 03, até o ponto 04, de coordenadas N=7.410.139,7341 e E=308.031,7475;
    deste ponto, segue com azimute de 277°32'41" e distância de 109,43 m, confrontando com a Rua das Palmeiras, até o ponto 04-A, de coordenadas N=7.410.154,0972 e E=307.923,2642;
    deste ponto, segue com azimute de 322°28'33" e distância de 12,76 m, confrontando com a Estrada Municipal, até o ponto 04-B, de coordenadas N=7.410.164,2149 e E=307.915,4961;
    deste ponto, segue em curva à direita com desenvolvimento de 80,35 m, raio de 160,00 m e ângulo central de 28°46'30", confrontando com o Lote 07, até o ponto 04-C, de coordenadas N=7.410.242,9289 e E=307.925,7590, onde teve início esta descrição, perfazendo uma área total de 10.490,13 m².
  `;

  const resultado1 = extrairInformacoes(textoCaso1);
  const validacao1 = validarGeometria(resultado1);

  assert(
    resultado1.formatoDescricao === "georreferenciada",
    "Formato classificado como georreferenciada",
  );
  assert(
    resultado1.coordenadas.length === 7,
    `Extraídos 7 registros de coordenadas (obtido: ${resultado1.coordenadas.length})`,
  );
  assert(
    resultado1.coordenadas[0].vertice === "04-C",
    "Primeiro vértice é 04-C",
  );
  assert(
    resultado1.coordenadas[6].vertice === "04-C",
    "Último vértice é 04-C (fechamento)",
  );
  assert(
    resultado1.segmentos.length === 6,
    `Extraídos exatamente 6 segmentos (obtido: ${resultado1.segmentos.length})`,
  );

  // Verificar segmentos retos e curvos
  const retos = resultado1.segmentos.filter((s) => s.geometria === "reta");
  const curvas = resultado1.segmentos.filter((s) => s.geometria === "curva");
  assert(
    retos.length === 5,
    `5 segmentos retos extraídos (obtido: ${retos.length})`,
  );
  assert(
    curvas.length === 1,
    `1 segmento em curva extraído (obtido: ${curvas.length})`,
  );

  // Verificar a ordem sequencial dos segmentos
  assert(resultado1.segmentos[0].destino === "06", "Segmento 1 termina em 06");
  assert(resultado1.segmentos[1].destino === "05", "Segmento 2 termina em 05");
  assert(resultado1.segmentos[2].destino === "04", "Segmento 3 termina em 04");
  assert(
    resultado1.segmentos[3].destino === "04-A",
    "Segmento 4 termina em 04-A",
  );
  assert(
    resultado1.segmentos[4].destino === "04-B",
    "Segmento 5 termina em 04-B",
  );
  assert(
    resultado1.segmentos[5].destino === "04-C",
    "Segmento 6 (curva) termina em 04-C",
  );
  assert(
    resultado1.segmentos[5].geometria === "curva",
    "Segmento 6 é geometria de curva",
  );

  // Verificar área
  assert(
    resultado1.areaTotal === 10490.13,
    `Área total extraída com precisão (10.490,13 m²): ${resultado1.areaTotal}`,
  );

  // Verificar validação e DXF
  assert(
    validacao1.resumo.permiteGeracaoDXF,
    "Validação aprova geração de DXF",
  );
  const dxf1 = await gerarDXFString(resultado1, validacao1);
  assert(
    dxf1.stringDxf.includes("SECTION"),
    "DXF gerado contém seções válidas",
  );
  assert(dxf1.stringDxf.includes("CONTORNO"), "DXF possui camada CONTORNO");
  assert(dxf1.stringDxf.includes("CURVAS"), "DXF possui camada CURVAS");
  assert(
    dxf1.stringDxf.includes("ARC"),
    "DXF desenhou entidade ARC para a curva real",
  );
  console.log("  ✓ Caso 1 concluído com sucesso.\n");

  // =========================================================================
  // CASO 2: Matrícula Convencional
  // - Frente: 10,00 m
  // - Lado direito: 22,19 m
  // - Lado esquerdo: 30,64 m
  // - Confrontações com lotes
  // - Sem exigir coordenadas
  // =========================================================================
  console.log("TESTE 2: Matrícula Convencional (sem coordenadas)");
  const textoCaso2 = `
    MATRÍCULA Nº 12.345 - CARTÓRIO DE REGISTRO DE IMÓVEIS
    Um terreno urbano constituído pelo Lote nº 14 da Quadra B, com as seguintes medidas e confrontações:
    pela frente para a Rua das Acácias, para onde mede 10,00 metros;
    pelo lado direito mede 22,19 metros confrontando com o lote 15;
    pelo lado esquerdo mede 30,64 metros confrontando com o lote 13;
    pelos fundos mede 10,00 metros confrontando com a área pública municipal.
  `;

  const resultado2 = extrairInformacoes(textoCaso2);
  const validacao2 = validarGeometria(resultado2);

  assert(
    resultado2.formatoDescricao === "convencional",
    "Formato classificado como convencional",
  );
  assert(resultado2.coordenadas.length === 0, "Nenhuma coordenada exigida");
  assert(
    resultado2.medidas.length >= 3,
    `Medidas extraídas: ${resultado2.medidas.length}`,
  );

  const frente = resultado2.medidas.find((m) => m.descricao === "frente");
  const ladoDir = resultado2.medidas.find(
    (m) => m.descricao === "lado direito",
  );
  const ladoEsq = resultado2.medidas.find(
    (m) => m.descricao === "lado esquerdo",
  );

  assert(frente?.valor === 10.0, `Frente extraída: ${frente?.valor} m`);
  assert(
    ladoDir?.valor === 22.19,
    `Lado direito extraído: ${ladoDir?.valor} m`,
  );
  assert(
    ladoEsq?.valor === 30.64,
    `Lado esquerdo extraído: ${ladoEsq?.valor} m`,
  );

  assert(
    validacao2.resumo.permiteGeracaoDXF,
    "Validação permite geração de DXF esquemático",
  );
  assert(
    validacao2.resumo.dxfAproximado,
    "DXF identificado explicitamente como aproximado",
  );
  
  const dxf2 = await gerarDXFString(resultado2, validacao2);
  assert(
    dxf2.stringDxf.includes("REPRESENTACAO ESQUEMATICA"),
    "DXF convencional contém nota de representação esquemática",
  );
  console.log("  ✓ Caso 2 concluído com sucesso.\n");

  // =========================================================================
  // CASO 2B: Matrícula Convencional com grafia cartorária (acentos e hífens)
  // - "com a área de -368,35- metros quadrados"
  // - "com frente para a RUA PELICANO,para onde mede 10,00 metros"
  // - "do lado direito mède 22,19metros onde confronta com o lote 39"
  // - "do lado esquerdo mede 30,64 metro."
  // =========================================================================
  console.log(
    "TESTE 2B: Matrícula Convencional Cartorária (hífens de proteção e acentos)",
  );
  const textoCaso2B = `
    com a área de -368,35- metros quadrados, o qual assim
    se descreve, caracteriza e confronta:com frente para a RUA PELICANO,para
    onde mede 10,00 metros;do lado direito mède 22,19metros onde
    confronta com o lote 39; do lado esquerdo mede 30,64 metro.
  `;

  const resultado2B = extrairInformacoes(textoCaso2B);
  const validacao2B = validarGeometria(resultado2B);

  assert(
    resultado2B.formatoDescricao === "convencional",
    "Formato classificado como convencional",
  );
  assert(
    resultado2B.areaTotal === 368.35,
    `Área com hífens protetores extraída: ${resultado2B.areaTotal} m²`,
  );

  const frente2B = resultado2B.medidas.find((m) => m.descricao === "frente");
  const ladoDir2B = resultado2B.medidas.find(
    (m) => m.descricao === "lado direito",
  );
  const ladoEsq2B = resultado2B.medidas.find(
    (m) => m.descricao === "lado esquerdo",
  );

  assert(frente2B?.valor === 10.0, `Frente extraída: ${frente2B?.valor} m`);
  assert(
    ladoDir2B?.valor === 22.19,
    `Lado direito extraído (com verbo mède e sem espaço): ${ladoDir2B?.valor} m`,
  );
  assert(
    ladoEsq2B?.valor === 30.64,
    `Lado esquerdo extraído: ${ladoEsq2B?.valor} m`,
  );

  assert(
    validacao2B.resumo.permiteGeracaoDXF,
    "Validação 2B permite geração de DXF esquemático",
  );
  console.log("  ✓ Caso 2B concluído com sucesso.\n");

  // =========================================================================
  // CASO 3: Dados Divergentes
  // - Documento com discrepância entre desenvolvimento, raio e coordenadas
  // - Preservação dos dados originais
  // - Produção de alertas sem distorcer os dados
  // =========================================================================
  console.log("TESTE 3: Dados Divergentes (Preservação e Alertas)");
  const textoCaso3 = `
    Inicia-se no ponto P1, de coordenadas N=1000.0000 e E=1000.0000;
    deste ponto, com distância de 50,00 m e azimute de 90°00'00" até o ponto P2, de coordenadas N=1000.0000 e E=1070.0000;
    deste ponto, segue em curva à direita com desenvolvimento de 40,00 m, raio de 20,00 m e ângulo central de 45°00'00" até o ponto P3, de coordenadas N=950.0000 e E=1070.0000;
    deste ponto, com distância de 70,00 m e azimute de 270°00'00" até o ponto P1, de coordenadas N=1000.0000 e E=1000.0000.
  `;

  const resultado3 = extrairInformacoes(textoCaso3);
  const validacao3 = validarGeometria(resultado3);

  // Distância declarada P1->P2 é 50.00m, mas coordenadas P1(1000, 1000) e P2(1000, 1070) dão 70.00m
  // Desenvolvimento declarado da curva é 40.00m, mas para R=20 e angulo=45°, D_calc = 20 * (45 * PI / 180) = 15.708m
  assert(
    resultado3.segmentos[0].distancia === 50.0,
    "Distância declarada original mantida intacta (50,00m)",
  );
  assert(
    resultado3.coordenadas[1].este === 1070.0,
    "Coordenada original mantida intacta (1070,00)",
  );

  assert(validacao3.resumo.possuiDivergencias, "Sistema acusou divergências");
  const alertaDist = validacao3.diagnosticos.some(
    (d) => d.tipo === "distancia_divergente",
  );
  const alertaCurva = validacao3.diagnosticos.some(
    (d) => d.tipo === "curva_divergente",
  );
  assert(alertaDist, "Diagnosticou alerta de distância divergente");
  assert(alertaCurva, "Diagnosticou alerta de curva divergente");

  const dxf3 = await gerarDXFString(resultado3, validacao3);
  assert(
    dxf3.avisos.length > 0,
    "DXF registrou avisos de divergências sem quebrar a execução",
  );
  console.log("  ✓ Caso 3 concluído com sucesso.\n");

  // =========================================================================
  // CASO 4: Dados Incompletos / OCR Prejudicado
  // - Documento com lacunas
  // - Sistema sinaliza limitações em vez de inventar dados
  // =========================================================================
  console.log("TESTE 4: Dados Incompletos / Limitações Técnicas");
  const textoCaso4 = `
    MATRÍCULA ILEGÍVEL
    O imóvel confronta ao norte com terras de João da Silva e ao sul com o córrego fundo.
    Não foram encontradas medidas expressas nem coordenadas.
  `;

  const resultado4 = extrairInformacoes(textoCaso4);
  const validacao4 = validarGeometria(resultado4);

  assert(
    resultado4.formatoDescricao === "insuficiente",
    "Formato classificado corretamente como insuficiente",
  );
  assert(
    !validacao4.resumo.permiteGeracaoDXF,
    "Sistema NÃO inventa coordenadas nem gera DXF arbitrário",
  );
  const alertaInsuf = validacao4.diagnosticos.some(
    (d) => d.tipo === "dados_insuficientes",
  );
  assert(alertaInsuf, "Diagnosticou explicitamente dados insuficientes");
  console.log("  ✓ Caso 4 concluído com sucesso.\n");

  // =========================================================================
  // CASO 5: Múltiplos Terrenos na Mesma Matrícula
  // - Documento descrevendo Lote 01 e Lote 02
  // - Separação individual sem mistura de medidas
  // - Validações geométricas independentes
  // =========================================================================
  console.log(
    "TESTE 5: Múltiplos Terrenos (Separação individual de informações)",
  );
  const textoCaso5 = `
    MATRÍCULA Nº 45.678 - DESMEMBRAMENTO DE ÁREA
    O imóvel foi desmembrado nos seguintes lotes:

    LOTE Nº 01: Um terreno urbano com frente para a Rua das Flores, para onde mede 12,00 metros;
    pelo lado direito mede 25,00 metros confrontando com o lote 03;
    pelo lado esquerdo mede 25,00 metros confrontando com o lote 04;
    pelos fundos mede 12,00 metros, encerrando a área total de 300,00 metros quadrados.

    LOTE Nº 02: Um terreno urbano com frente para a Rua das Flores, para onde mede 15,00 metros;
    pelo lado direito mede 30,00 metros confrontando com o lote 05;
    pelo lado esquerdo mede 30,00 metros confrontando com o lote 01;
    pelos fundos mede 15,00 metros, encerrando a área total de 450,00 metros quadrados.
  `;

  const terrenosCaso5 = separarTerrenos(textoCaso5, { qtdEsperada: 2 });
  assert(
    terrenosCaso5.length === 2,
    `Identificados exatamente 2 terrenos (obtido: ${terrenosCaso5.length})`,
  );

  const t1 = terrenosCaso5[0];
  const t2 = terrenosCaso5[1];

  // Validação do Terreno 1
  assert(
    t1.resultado.formatoDescricao === "convencional",
    "Terreno 1 classificado como convencional",
  );
  assert(
    t1.resultado.areaTotal === 300,
    `Terreno 1 com área de 300 m² (obtido: ${t1.resultado.areaTotal})`,
  );
  const frenteT1 = t1.resultado.medidas.find((m) => m.descricao === "frente");
  assert(
    frenteT1?.valor === 12.0,
    `Terreno 1 frente: 12.00m (obtido: ${frenteT1?.valor})`,
  );

  // Validação do Terreno 2
  assert(
    t2.resultado.formatoDescricao === "convencional",
    "Terreno 2 classificado como convencional",
  );
  assert(
    t2.resultado.areaTotal === 450,
    `Terreno 2 com área de 450 m² (obtido: ${t2.resultado.areaTotal})`,
  );
  const frenteT2 = t2.resultado.medidas.find((m) => m.descricao === "frente");
  assert(
    frenteT2?.valor === 15.0,
    `Terreno 2 frente: 15.00m (obtido: ${frenteT2?.valor})`,
  );

  // Validação geométrica independente de cada um
  const valT1 = validarGeometria(t1.resultado);
  const valT2 = validarGeometria(t2.resultado);
  assert(valT1.resumo.permiteGeracaoDXF, "Validação aprova DXF do Terreno 1");
  assert(valT2.resumo.permiteGeracaoDXF, "Validação aprova DXF do Terreno 2");
  console.log("  ✓ Caso 5 concluído com sucesso.\n");

  // =========================================================================
  // CASO 6: Geração de DXF Unificado Multi-Terreno com Camadas Independentes
  // =========================================================================
  console.log(
    "TESTE 6: Geração de DXF Unificado Multi-Terreno (Camadas independentes)",
  );
  const itensDxf = [
    { id: t1.id, titulo: t1.titulo, dados: t1.resultado, validacao: valT1 },
    { id: t2.id, titulo: t2.titulo, dados: t2.resultado, validacao: valT2 },
  ];

  const dxfMulti = await gerarDXFStringMultiplosTerrenos(itensDxf);
  assert(
    dxfMulti.stringDxf.includes("T1_CONTORNO"),
    "DXF possui camada T1_CONTORNO",
  );
  assert(
    dxfMulti.stringDxf.includes("T2_CONTORNO"),
    "DXF possui camada T2_CONTORNO",
  );
  assert(
    dxfMulti.stringDxf.includes("T1_MEDIDAS"),
    "DXF possui camada T1_MEDIDAS",
  );
  assert(
    dxfMulti.stringDxf.includes("T2_MEDIDAS"),
    "DXF possui camada T2_MEDIDAS",
  );
  console.log("  ✓ Caso 6 concluído com sucesso.\n");

  // =========================================================================
  // CASO 7: Matrícula com Rumos e Distâncias (Topografia Perimétrica de Cotia)
  // - Inicia no marco Ponto "D"
  // - D -> C: rumo 75º 57'30" NE, 183,16 m
  // - C -> H: deflete à direita seguindo um córrego, 10l,O0 metros (101,00 m)
  // - H -> I: rumo 83229'54" SW, 200,68 m
  // - I -> J: rumo 22º2'06" NW, 44,o3 m (44,03 m)
  // - J -> D: rumo l2s0l'-07" NW, 26,80 m
  // - Área total declarada: 16.224,21 mts2
  // =========================================================================
  console.log("TESTE 7: Matrícula por Rumos e Distâncias (Poligonal de Cotia)");
  const textoCaso7 = `
    OFICIAL DE REGISTRO DE IMÓVEIS E ANEXOS
    COMARCA DE COTIA - ESTADO DE SÃO PAULO
    matricula -10.205-
    IMOVEL:- Dentro de área maior, uma érea de terras, situada
    em zona urbana no BAIRRO DO RIBEIRÃO, Municipio e Comarca de
    Cotia, Estado de São Paulo, que mede 16.224,21 mts2(dezes.-
    seis mil, duzentos e vinte e quatro metros e vinte e um cen-
    timetros quadrados), oom as medidas e confrontações seguin -
    tes: Inioia-se num marco de conoreto denominado Ponto "D",im
    plantado a margem da Estrada Municipal, seguindo o rumo de
    75º 57'30" NE e com a extensão de 183,16 metros, enoontra-se
    com o ponto C; nêsse segmento tem como confrontante o sr. Pe
    dro Armando Eberhardt; dêsse ponto deflete à direita seguin-
    do um corrego e numa exteneão de 10l,O0 metros, encontra-se-
    com o ponto "H"; dêsse ponto deflete à direita com rumo de
    83229'54" SW e com 8 extensão de 200,68 metros, encontra-se-
    com o ponto "I". Nêsse segmento tem como confrontante os Ir-
    mãoa Boetcoher. Dêsse ponto deflete à direita com o rumo de-
    22º2'06" NW e com a extensão de 44,o3 m., encontra se com o-
    ponto "J"; dêsse ponto deflete à direita com rumo de l2s0l'-
    07" NW e numa extensão de 26,80 metros, encontra-se com o
    ponto "D", onde deu origem esta descrição.
  `;

  const resultado7 = extrairInformacoes(textoCaso7);
  const validacao7 = validarGeometria(resultado7);

  assert(
    resultado7.areaTotal === 16224.21,
    `Área total de 16.224,21 m² extraída com sucesso (obtido: ${resultado7.areaTotal})`,
  );
  assert(
    resultado7.segmentos.length >= 5,
    `Pelo menos 5 segmentos extraídos (obtido: ${resultado7.segmentos.length})`,
  );
  assert(
    resultado7.coordenadas.length >= 5,
    `Coordenadas da poligonal reconstruídas com sucesso (obtido: ${resultado7.coordenadas.length} vértices)`,
  );
  assert(
    resultado7.coordenadas[0].vertice === "D",
    "Vértice inicial é o ponto D",
  );
  assert(
    resultado7.formatoDescricao === "georreferenciada",
    "Formato classificado como georreferenciada/perimétrica",
  );

  assert(
    validacao7.resumo.permiteGeracaoDXF,
    "Validação geométrica aprova a geração do DXF da poligonal",
  );
  const dxf7 = await gerarDXFString(resultado7, validacao7);
  assert(
    dxf7.stringDxf.includes("CONTORNO"),
    "DXF possui camada de contorno da poligonal",
  );
  assert(
    dxf7.stringDxf.includes("VERTICES"),
    "DXF possui marcação dos vértices D, C, H, I, J",
  );
  console.log("  ✓ Caso 7 concluído com sucesso.\n");

  // =========================================================================
  // CASO 8: Validação de Intervalos de Páginas e Flag de Divergência
  // =========================================================================
  console.log(
    "TESTE 8: Validação de PageRanges e Divergência de Quantidade de Terrenos",
  );

  // 8.1 Validação e desduplicação de pageRanges
  const paginasValidas = normalizarPageRanges(
    [
      { start: 1, end: 3 },
      { start: 2, end: 4 },
      { start: 6, end: 6 },
    ],
    10,
  );
  assert(
    JSON.stringify(paginasValidas) === JSON.stringify([1, 2, 3, 4, 6]),
    `Intervalos desduplicados e ordenados corretamente: ${paginasValidas.join(", ")}`,
  );

  // 8.2 Rejeição de intervalos inválidos
  let erroDisparado = false;
  try {
    normalizarPageRanges([{ start: 5, end: 2 }], 10);
  } catch {
    erroDisparado = true;
  }
  assert(erroDisparado, "Erro lançado quando start > end");

  erroDisparado = false;
  try {
    normalizarPageRanges([{ start: 1, end: 12 }], 10);
  } catch {
    erroDisparado = true;
  }
  assert(erroDisparado, "Erro lançado quando end > totalPages");

  // 8.3 Verificação da flag divergenciaQtd quando a contagem coincide
  const resSeparacaoCorreta = separarTerrenosComResultado(textoCaso5, {
    expectedLotsCount: 2,
  });
  assert(resSeparacaoCorreta.terrenos.length === 2, "2 terrenos extraídos");
  assert(
    resSeparacaoCorreta.divergenciaQtd === false,
    "divergenciaQtd é false quando esperado coincide com extraído",
  );

  // 8.4 Verificação da flag divergenciaQtd quando a contagem diverge
  const resSeparacaoDivergente = separarTerrenosComResultado(textoCaso5, {
    expectedLotsCount: 3,
  });
  assert(resSeparacaoDivergente.terrenos.length === 2, "2 terrenos extraídos");
  assert(
    resSeparacaoDivergente.divergenciaQtd === true,
    "divergenciaQtd é true quando esperado (3) diverge do extraído (2)",
  );

  // 8.5 Verificação via chamada padrão com propriedades anexadas
  const terrenosArray = separarTerrenos(textoCaso5, { expectedLotsCount: 4 });
  assert(
    terrenosArray.divergenciaQtd === true,
    "terrenosArray.divergenciaQtd é true",
  );
  assert(
    terrenosArray.expectedLotsCount === 4,
    "terrenosArray.expectedLotsCount é 4",
  );
  console.log("  ✓ Caso 8 concluído com sucesso.\n");

  console.log("==============================================================");
  console.log("TODOS OS TESTES FORAM EXECUTADOS E APROVADOS COM SUCESSO! 🎉");
  console.log("==============================================================");
}

void runTests();
