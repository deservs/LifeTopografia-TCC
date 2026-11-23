import {
  useState,
  useTransition,
  useEffect,
  type ChangeEvent,
  type DragEvent,
} from "react";
import useOcrPipeline from "../../hook/useOcrPipeline";
import {
  extrairInformacoes,
  separarTerrenos,
  type TerrenoExtraido,
  type TerrenosExtraidosLista,
} from "../../utils/textSanitizer";
import {
  validarGeometria,
  type ResultadoValidacao,
} from "../../utils/validarGeometria";
import {
  gerarDXF,
  gerarDXFMultiplosTerrenos,
  type OpcoesGeracaoDXF,
  type ResultadoGeracaoDXF,
} from "../../utils/drawDXF";
import { getPdfPageCount, type PageRange } from "../../utils/pdfConvert";

export default function EnviarArquivos() {
  const ocrPipeline = useOcrPipeline();
  const [, startTransition] = useTransition();

  // Estados do arquivo
  const [arquivoFile, setArquivoFile] = useState<File | null>(null);
  const [arquivoNome, setArquivoNome] = useState<string>("");
  const [tamanhoBytes, setTamanhoBytes] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [mostrarPdfNoResultado, setMostrarPdfNoResultado] = useState(true);

  // Etapa do fluxo: "upload" -> "configuracao" -> "resultado"
  const [etapa, setEtapa] = useState<"upload" | "configuracao" | "resultado">(
    "upload",
  );

  // Configurações do usuário antes de processar
  // Bloco 1: Seleção manual de intervalos obrigatória
  const [intervalos, setIntervalos] = useState<PageRange[]>([
    { start: 1, end: 1 },
  ]);
  // Bloco 2: Quantidade explícita de terrenos ("um" = 1 ou "multiplos" >= 2)
  const [modoTerrenos, setModoTerrenos] = useState<"um" | "multiplos">("um");
  const [qtdTerrenosInformada, setQtdTerrenosInformada] = useState<number>(2);
  const [forcarOcrManual, setForcarOcrManual] = useState<boolean>(false);

  // Estados dos terrenos identificados e processados
  const [terrenos, setTerrenos] = useState<
    TerrenosExtraidosLista | TerrenoExtraido[]
  >([]);
  const [expectedLotsCountFinal, setExpectedLotsCountFinal] =
    useState<number>(1);
  const [divergenciaDetectada, setDivergenciaDetectada] =
    useState<boolean>(false);
  const [validacoes, setValidacoes] = useState<
    Record<string, ResultadoValidacao>
  >({});
  const [terrenoAtivoIndex, setTerrenoAtivoIndex] = useState<number>(0);
  const [abaAtivaDetalhe, setAbaAtivaDetalhe] = useState<
    "dados" | "validacao" | "texto"
  >("dados");
  const [resultadoDxf, setResultadoDxf] = useState<ResultadoGeracaoDXF | null>(
    null,
  );

  // Cleanup e criação da URL do Blob do PDF
  useEffect(() => {
    if (!arquivoFile) {
      setPdfBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(arquivoFile);
    setPdfBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [arquivoFile]);

  // Opções para geração de DXF
  const [opcoesDxf] = useState<OpcoesGeracaoDXF>({
    incluirVertices: true,
    incluirIdentificacao: true,
    incluirMedidas: true,
    incluirAzimutes: true,
    incluirConfrontacoes: true,
  });

  // 1. ANÁLISE INICIAL DO PDF AO SELECIONAR (sem rodar OCR)
  const handleSelecionarArquivo = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      alert("Por favor, selecione um arquivo no formato PDF.");
      return;
    }

    setArquivoFile(file);
    setArquivoNome(file.name);
    setTamanhoBytes(file.size);
    setTerrenos([]);
    setValidacoes({});
    setResultadoDxf(null);
    setDivergenciaDetectada(false);
    ocrPipeline.limpar();

    try {
      const count = await getPdfPageCount(file);
      setTotalPaginas(count);
      setIntervalos([{ start: 1, end: count }]);
      setEtapa("configuracao");
    } catch (err) {
      console.error("Erro ao analisar páginas do PDF:", err);
      setTotalPaginas(1);
      setIntervalos([{ start: 1, end: 1 }]);
      setEtapa("configuracao");
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleSelecionarArquivo(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleSelecionarArquivo(file);
  };

  // Gerenciamento dos intervalos de páginas
  const adicionarIntervalo = () => {
    setIntervalos((prev) => [...prev, { start: 1, end: totalPaginas || 1 }]);
  };

  const removerIntervalo = (index: number) => {
    if (intervalos.length <= 1) {
      alert("É necessário manter pelo menos um intervalo de páginas.");
      return;
    }
    setIntervalos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const atualizarIntervalo = (
    index: number,
    campo: "start" | "end",
    valor: number,
  ) => {
    const valNumerico = isNaN(valor) ? 1 : valor;
    setIntervalos((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [campo]: valNumerico } : item,
      ),
    );
  };

  // 2. INICIAR PROCESSAMENTO DO DOCUMENTO
  const handleIniciarProcessamento = async () => {
    if (!arquivoFile) return;

    // Validação estrita de cada intervalo: 1 <= start <= end <= totalPaginas
    for (let i = 0; i < intervalos.length; i++) {
      const inv = intervalos[i];
      if (inv.start < 1 || inv.end < inv.start || inv.end > totalPaginas) {
        alert(
          `Intervalo ${i + 1} inválido: página ${inv.start} até ${inv.end}.\n` +
            `O documento possui ${totalPaginas} página(s). É obrigatório que 1 <= início <= fim <= ${totalPaginas}.`,
        );
        return;
      }
    }

    const expectedLotsCount =
      modoTerrenos === "um" ? 1 : Math.max(2, qtdTerrenosInformada);
    setExpectedLotsCountFinal(expectedLotsCount);

    try {
      const textoCompleto = await ocrPipeline.executarTarefa(arquivoFile, {
        pageRanges: intervalos,
        expectedLotsCount,
        forcarOcr: forcarOcrManual,
      });

      if (textoCompleto) {
        startTransition(() => {
          const terrenosExtraidos = separarTerrenos(textoCompleto, {
            expectedLotsCount,
          });
          const mapaValidacoes: Record<string, ResultadoValidacao> = {};

          for (const t of terrenosExtraidos) {
            mapaValidacoes[t.id] = validarGeometria(t.resultado);
          }

          setTerrenos(terrenosExtraidos);
          setDivergenciaDetectada(
            terrenosExtraidos.divergenciaQtd ||
              terrenosExtraidos.length !== expectedLotsCount,
          );
          setValidacoes(mapaValidacoes);
          setTerrenoAtivoIndex(0);
          setEtapa("resultado");
        });
      }
    } catch (err) {
      console.error("Falha ao executar pipeline de leitura:", err);
    }
  };

  // Reprocessar texto editado de um terreno específico
  const handleAtualizarTextoTerreno = (id: string, novoTexto: string) => {
    const novoResultado = extrairInformacoes(novoTexto);
    const novaValidacao = validarGeometria(novoResultado);

    setTerrenos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, textoOriginal: novoTexto, resultado: novoResultado }
          : t,
      ),
    );

    setValidacoes((prev) => ({
      ...prev,
      [id]: novaValidacao,
    }));
    setResultadoDxf(null);
  };

  // GERAÇÃO DE DXF
  const handleDownloadDxfIndividual = (terreno: TerrenoExtraido) => {
    const val = validacoes[terreno.id];
    if (!val || !val.resumo.permiteGeracaoDXF) return;

    const nomeBase = arquivoNome.replace(/\.pdf$/i, "");
    const res = gerarDXF(terreno.resultado, val, {
      ...opcoesDxf,
      nomeArquivo: `${nomeBase}_${terreno.id}.dxf`,
    });
    setResultadoDxf(res);
  };

  const handleDownloadDxfUnificado = () => {
    const itens = terrenos.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      dados: t.resultado,
      validacao: validacoes[t.id],
    }));

    const nomeBase = arquivoNome.replace(/\.pdf$/i, "");
    const res = gerarDXFMultiplosTerrenos(itens, {
      ...opcoesDxf,
      nomeArquivo: `${nomeBase}_completo.dxf`,
    });
    setResultadoDxf(res);
  };

  const formatarTamanho = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const corBadgeFormato = (formato?: string) => {
    switch (formato) {
      case "georreferenciada":
        return { bg: "#e6fffa", text: "#047857", border: "#10b981" };
      case "convencional":
        return { bg: "#eff6ff", text: "#1d4ed8", border: "#3b82f6" };
      case "mista":
        return { bg: "#f5f3ff", text: "#6d28d9", border: "#8b5cf6" };
      default:
        return { bg: "#fff1f2", text: "#be123c", border: "#f43f5e" };
    }
  };

  const terrenoAtivo = terrenos[terrenoAtivoIndex];
  const validacaoAtiva = terrenoAtivo ? validacoes[terrenoAtivo.id] : null;

  return (
    <div
      style={{
        maxWidth: "1350px",
        margin: "0 auto",
        padding: "24px 16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#1f2937",
      }}
    >
      {/* Cabeçalho */}
      <header
        style={{
          marginBottom: "24px",
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: "16px",
        }}
      >
        <h1
          style={{
            fontSize: "26px",
            fontWeight: "700",
            color: "#111827",
            margin: "0 0 6px 0",
          }}
        >
          Leitura de Matrículas e Geração de DXF
        </h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
          Visualização integrada do documento PDF, seleção manual de intervalos
          de páginas e extração isolada de múltiplos terrenos.
        </p>
      </header>

      {/* 1. ETAPA DE UPLOAD */}
      {etapa === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? "#3b82f6" : "#cbd5e1"}`,
            borderRadius: "12px",
            padding: "48px 20px",
            textAlign: "center",
            backgroundColor: isDragging ? "#f0f9ff" : "#f8fafc",
            transition: "all 0.2s ease",
            cursor: "pointer",
            marginBottom: "24px",
          }}
        >
          <input
            type="file"
            id="pdf-upload-input"
            accept="application/pdf"
            onChange={handleInputChange}
            style={{ display: "none" }}
          />
          <label
            htmlFor="pdf-upload-input"
            style={{ cursor: "pointer", display: "block" }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📄</div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                margin: "0 0 6px 0",
                color: "#374151",
              }}
            >
              Clique ou arraste a Matrícula Imobiliária em PDF aqui
            </h3>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
              O PDF será exibido na tela para você consultar as páginas e
              indicar os memoriais.
            </p>
          </label>
        </div>
      )}

      {/* 2. ETAPA DE CONFIGURAÇÃO (PDF Viewer Lado a Lado com Seleção Manual de Intervalos e Terrenos) */}
      {etapa === "configuracao" && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "28px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          {/* Barra de Informações do Arquivo */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              paddingBottom: "16px",
              borderBottom: "1px solid #f3f4f6",
              marginBottom: "20px",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Documento Carregado
              </span>
              <h2
                style={{
                  fontSize: "17px",
                  fontWeight: "700",
                  margin: "2px 0 0 0",
                  color: "#111827",
                }}
              >
                📎 {arquivoNome}
              </h2>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <span
                style={{
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "700",
                }}
              >
                Total: {totalPaginas} página{totalPaginas !== 1 ? "s" : ""}
              </span>
              <span style={{ color: "#9ca3af", fontSize: "13px" }}>
                ({formatarTamanho(tamanhoBytes)})
              </span>
              <button
                type="button"
                onClick={() => setEtapa("upload")}
                style={{
                  background: "transparent",
                  border: "1px solid #d1d5db",
                  color: "#6b7280",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Trocar arquivo
              </button>
            </div>
          </div>

          {/* Grid Principal: Visualizador do PDF + Painel de Parâmetros */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
              gap: "24px",
              alignItems: "start",
            }}
          >
            {/* Coluna 1: Visualizador de PDF Embutido */}
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                padding: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                  }}
                >
                  📖 Consulta do PDF ({totalPaginas} pág
                  {totalPaginas !== 1 ? "s" : ""})
                </span>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  Use o visualizador para localizar as páginas das descrições
                </span>
              </div>
              {pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  title="Consulta do PDF"
                  style={{
                    width: "100%",
                    height: "580px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    background: "#ffffff",
                  }}
                />
              ) : (
                <div
                  style={{
                    height: "400px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                  }}
                >
                  Carregando visualizador do PDF...
                </div>
              )}
            </div>

            {/* Coluna 2: Parâmetros Manuais Obrigatórios */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Bloco 1: Intervalos de Páginas Obrigatórios */}
              <div
                style={{
                  background: "#f9fafb",
                  padding: "18px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "#111827",
                    margin: "0 0 6px 0",
                  }}
                >
                  1. Intervalos de Páginas para Leitura
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#4b5563",
                    margin: "0 0 14px 0",
                  }}
                >
                  Informe onde estão as descrições dos terrenos. Apenas as
                  páginas especificadas serão lidas e processadas.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {intervalos.map((inv, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: "#ffffff",
                        padding: "10px 14px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        Intervalo {idx + 1}:
                      </span>
                      <span style={{ fontSize: "13px", color: "#4b5563" }}>
                        De pág:
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={totalPaginas}
                        value={inv.start}
                        onChange={(e) =>
                          atualizarIntervalo(
                            idx,
                            "start",
                            Number(e.target.value),
                          )
                        }
                        style={{
                          width: "65px",
                          padding: "6px 8px",
                          borderRadius: "4px",
                          border: "1px solid #d1d5db",
                          fontSize: "14px",
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      />
                      <span style={{ fontSize: "13px", color: "#4b5563" }}>
                        até:
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={totalPaginas}
                        value={inv.end}
                        onChange={(e) =>
                          atualizarIntervalo(idx, "end", Number(e.target.value))
                        }
                        style={{
                          width: "65px",
                          padding: "6px 8px",
                          borderRadius: "4px",
                          border: "1px solid #d1d5db",
                          fontSize: "14px",
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      />
                      {intervalos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removerIntervalo(idx)}
                          style={{
                            background: "#fee2e2",
                            border: "1px solid #fca5a5",
                            color: "#b91c1c",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            marginLeft: "auto",
                          }}
                          title="Remover este intervalo"
                        >
                          ✕ Remover
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={adicionarIntervalo}
                    style={{
                      alignSelf: "flex-start",
                      background: "#ffffff",
                      border: "1px dashed #2563eb",
                      borderRadius: "6px",
                      padding: "6px 14px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#2563eb",
                      cursor: "pointer",
                      marginTop: "4px",
                    }}
                  >
                    + Adicionar outro intervalo de páginas
                  </button>
                </div>
              </div>

              {/* Bloco 2: Quantidade Explícita de Terrenos */}
              <div
                style={{
                  background: "#f9fafb",
                  padding: "18px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "#111827",
                    margin: "0 0 6px 0",
                  }}
                >
                  2. Quantos terrenos estão descritos neste documento?
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#4b5563",
                    margin: "0 0 12px 0",
                  }}
                >
                  Indique a quantidade esperada para segmentar com precisão as
                  descrições.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "14px",
                      cursor: "pointer",
                      background: modoTerrenos === "um" ? "#eff6ff" : "#ffffff",
                      border: `1px solid ${modoTerrenos === "um" ? "#3b82f6" : "#e5e7eb"}`,
                      padding: "10px 14px",
                      borderRadius: "6px",
                    }}
                  >
                    <input
                      type="radio"
                      name="modoTerrenos"
                      checked={modoTerrenos === "um"}
                      onChange={() => setModoTerrenos("um")}
                    />
                    <div>
                      <span style={{ fontWeight: "700" }}>Um terreno (1)</span>
                      <p
                        style={{
                          margin: "2px 0 0 0",
                          fontSize: "12px",
                          color: "#6b7280",
                        }}
                      >
                        O documento descreve uma única gleba, lote ou imóvel.
                      </p>
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      fontSize: "14px",
                      cursor: "pointer",
                      background:
                        modoTerrenos === "multiplos" ? "#eff6ff" : "#ffffff",
                      border: `1px solid ${modoTerrenos === "multiplos" ? "#3b82f6" : "#e5e7eb"}`,
                      padding: "10px 14px",
                      borderRadius: "6px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <input
                        type="radio"
                        name="modoTerrenos"
                        checked={modoTerrenos === "multiplos"}
                        onChange={() => setModoTerrenos("multiplos")}
                      />
                      <div>
                        <span style={{ fontWeight: "700" }}>
                          Mais de um terreno
                        </span>
                        <p
                          style={{
                            margin: "2px 0 0 0",
                            fontSize: "12px",
                            color: "#6b7280",
                          }}
                        >
                          Segmentar individualmente descrições de
                          desmembramentos, múltiplos lotes ou glebas.
                        </p>
                      </div>
                    </div>

                    {modoTerrenos === "multiplos" && (
                      <div
                        style={{
                          paddingLeft: "26px",
                          paddingTop: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Quantidade de terrenos (obrigatório):
                        </span>
                        <input
                          type="number"
                          min={2}
                          max={100}
                          value={qtdTerrenosInformada}
                          onChange={(e) =>
                            setQtdTerrenosInformada(
                              Math.max(2, Number(e.target.value) || 2),
                            )
                          }
                          style={{
                            width: "70px",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid #3b82f6",
                            fontSize: "14px",
                            fontWeight: "700",
                            textAlign: "center",
                          }}
                        />
                      </div>
                    )}
                  </label>
                </div>

                {/* Opção avançada de OCR */}
                <div
                  style={{
                    marginTop: "14px",
                    paddingTop: "12px",
                    borderTop: "1px dashed #e5e7eb",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      color: "#4b5563",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={forcarOcrManual}
                      onChange={(e) => setForcarOcrManual(e.target.checked)}
                    />
                    <span>
                      Forçar reconhecimento visual via PaddleOCR (caso o texto
                      nativo esteja corrompido)
                    </span>
                  </label>
                </div>
              </div>

              {/* Botão de Ação */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleIniciarProcessamento}
                  disabled={ocrPipeline.status === "carregando"}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    padding: "12px 28px",
                    borderRadius: "8px",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor:
                      ocrPipeline.status === "carregando"
                        ? "not-allowed"
                        : "pointer",
                    boxShadow: "0 2px 4px rgba(37,99,235,0.25)",
                    width: "100%",
                  }}
                >
                  🚀 Iniciar Leitura das Páginas Selecionadas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE PROGRESSO / STATUS */}
      {ocrPipeline.status === "carregando" && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "16px 20px",
            borderRadius: "8px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "20px",
                height: "20px",
                border: "3px solid #3b82f6",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: "600",
                  color: "#1e40af",
                  fontSize: "15px",
                }}
              >
                Processando Páginas Selecionadas...
              </p>
              <p
                style={{
                  margin: "2px 0 0 0",
                  color: "#3b82f6",
                  fontSize: "13px",
                }}
              >
                {ocrPipeline.progresso}
              </p>
            </div>
          </div>
        </div>
      )}

      {ocrPipeline.status === "erro" && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            padding: "16px 20px",
            borderRadius: "8px",
            marginBottom: "24px",
            color: "#991b1b",
          }}
        >
          <p style={{ margin: 0, fontWeight: "600" }}>
            Erro ao processar as páginas do documento.
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px" }}>
            {ocrPipeline.progresso}
          </p>
          <button
            type="button"
            onClick={() => setEtapa("configuracao")}
            style={{
              marginTop: "10px",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              color: "#991b1b",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            ← Voltar para configuração de páginas
          </button>
        </div>
      )}

      {/* 3. ETAPA DE RESULTADOS E CONFERÊNCIA INDIVIDUAL */}
      {etapa === "resultado" && terrenos.length > 0 && (
        <div>
          {/* Alerta de Divergência de Quantidade de Terrenos (se lots.length !== expectedLotsCount) */}
          {divergenciaDetectada && (
            <div
              style={{
                background: "#fffbeb",
                border: "2px solid #f59e0b",
                borderRadius: "10px",
                padding: "16px 20px",
                marginBottom: "20px",
                color: "#92400e",
                boxShadow: "0 2px 4px rgba(245,158,11,0.1)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span style={{ fontSize: "24px" }}>⚠️</span>
                <div>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: "700",
                      color: "#b45309",
                    }}
                  >
                    Divergência na Quantidade de Terrenos Identificados
                  </h4>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "14px",
                      color: "#92400e",
                    }}
                  >
                    Foram identificados <strong>{terrenos.length}</strong>{" "}
                    terreno(s) na extração do texto, mas foram informados{" "}
                    <strong>{expectedLotsCountFinal}</strong> terreno(s).
                    Confira as descrições abaixo ou retorne para ajustar os
                    intervalos de páginas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Header de Ações e Resumo Geral */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "18px 20px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    margin: 0,
                    color: "#111827",
                  }}
                >
                  {terrenos.length > 1
                    ? `Extração Concluída: ${terrenos.length} Terrenos Identificados`
                    : "Extração Concluída: 1 Terreno Identificado"}
                </h2>
                <span
                  style={{
                    background: "#f3f4f6",
                    color: "#4b5563",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  {ocrPipeline.metodoExtracao === "nativo"
                    ? "Digital Nativo"
                    : "OCR PaddleOCR"}
                </span>
              </div>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "13px",
                  color: "#6b7280",
                }}
              >
                Confira individualmente cada lote antes de baixar os arquivos
                CAD/DXF.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setMostrarPdfNoResultado(!mostrarPdfNoResultado)}
                style={{
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {mostrarPdfNoResultado
                  ? "👁️ Ocultar PDF"
                  : "👁️ Ver PDF Original"}
              </button>

              <button
                type="button"
                onClick={() => setEtapa("configuracao")}
                style={{
                  background: "#f9fafb",
                  color: "#4b5563",
                  border: "1px solid #d1d5db",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ⚙️ Ajustar Páginas / Configuração
              </button>

              {terrenos.length > 1 && (
                <button
                  type="button"
                  onClick={handleDownloadDxfUnificado}
                  style={{
                    backgroundColor: "#1e40af",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  📥 Baixar DXF Unificado (Todos os Lotes)
                </button>
              )}
            </div>
          </div>

          {/* Visualizador de PDF retrátil na etapa de resultado para conferência direta */}
          {mostrarPdfNoResultado && pdfBlobUrl && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#374151",
                  }}
                >
                  📄 PDF Original ({arquivoNome} - {totalPaginas} páginas)
                </span>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                  Consulte os dados no documento original para confrontar com a
                  extração abaixo
                </span>
              </div>
              <iframe
                src={pdfBlobUrl}
                title="Conferência do PDF Original"
                style={{
                  width: "100%",
                  height: "420px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                }}
              />
            </div>
          )}

          {/* Feedback de Download DXF */}
          {resultadoDxf && (
            <div
              style={{
                background: resultadoDxf.sucesso
                  ? resultadoDxf.aproximado
                    ? "#fffbeb"
                    : "#ecfdf5"
                  : "#fef2f2",
                border: `1px solid ${resultadoDxf.sucesso ? (resultadoDxf.aproximado ? "#fde68a" : "#a7f3d0") : "#fecaca"}`,
                borderRadius: "8px",
                padding: "14px 18px",
                marginBottom: "20px",
                color: resultadoDxf.sucesso
                  ? resultadoDxf.aproximado
                    ? "#92400e"
                    : "#065f46"
                  : "#991b1b",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "600",
                }}
              >
                <span>
                  {resultadoDxf.sucesso
                    ? resultadoDxf.aproximado
                      ? "⚠️"
                      : "✓"
                    : "✕"}
                </span>
                <span>{resultadoDxf.mensagem}</span>
              </div>
              {resultadoDxf.avisos.length > 0 && (
                <ul
                  style={{
                    margin: "8px 0 0 20px",
                    padding: 0,
                    fontSize: "13px",
                  }}
                >
                  {resultadoDxf.avisos.map((av, i) => (
                    <li key={i}>{av}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Seletor de Terrenos (quando houver mais de um) */}
          {terrenos.length > 1 && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                overflowX: "auto",
                paddingBottom: "8px",
                marginBottom: "16px",
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              {terrenos.map((t, idx) => {
                const ativo = idx === terrenoAtivoIndex;
                const v = validacoes[t.id];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTerrenoAtivoIndex(idx);
                      setResultadoDxf(null);
                    }}
                    style={{
                      background: ativo ? "#ffffff" : "#f9fafb",
                      border: "1px solid",
                      borderColor: ativo ? "#2563eb" : "#e5e7eb",
                      borderBottomColor: ativo ? "#ffffff" : "#e5e7eb",
                      borderRadius: "8px 8px 0 0",
                      padding: "8px 16px",
                      fontSize: "14px",
                      fontWeight: ativo ? "700" : "500",
                      color: ativo ? "#1d4ed8" : "#4b5563",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "-2px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span>{t.titulo}</span>
                    {t.intervaloPaginas && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#6b7280",
                          background: "#f3f4f6",
                          padding: "1px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        {t.intervaloPaginas}
                      </span>
                    )}
                    {v?.resumo.possuiDivergencias && (
                      <span style={{ fontSize: "11px", color: "#d97706" }}>
                        ⚠️
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Painel do Terreno Selecionado */}
          {terrenoAtivo && validacaoAtiva && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              {/* Barra do Terreno Ativo */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid #f3f4f6",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        margin: 0,
                        color: "#111827",
                      }}
                    >
                      {terrenoAtivo.titulo}
                    </h3>
                    <span
                      style={{
                        background: corBadgeFormato(
                          terrenoAtivo.resultado.formatoDescricao,
                        ).bg,
                        color: corBadgeFormato(
                          terrenoAtivo.resultado.formatoDescricao,
                        ).text,
                        border: `1px solid ${corBadgeFormato(terrenoAtivo.resultado.formatoDescricao).border}`,
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontWeight: "700",
                        fontSize: "12px",
                        textTransform: "capitalize",
                      }}
                    >
                      {terrenoAtivo.resultado.formatoDescricao}
                    </span>
                    {terrenoAtivo.intervaloPaginas && (
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>
                        ({terrenoAtivo.intervaloPaginas})
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleDownloadDxfIndividual(terrenoAtivo)}
                    disabled={!validacaoAtiva.resumo.permiteGeracaoDXF}
                    style={{
                      backgroundColor: validacaoAtiva.resumo.permiteGeracaoDXF
                        ? "#059669"
                        : "#9ca3af",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontWeight: "600",
                      fontSize: "14px",
                      cursor: validacaoAtiva.resumo.permiteGeracaoDXF
                        ? "pointer"
                        : "not-allowed",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  >
                    📥 Baixar DXF deste Terreno
                  </button>
                </div>
              </div>

              {/* Cards de Métricas do Terreno */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      textTransform: "uppercase",
                      fontWeight: "600",
                    }}
                  >
                    Vértices/Coords
                  </span>
                  <p
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      margin: "4px 0 0 0",
                      color: "#0f172a",
                    }}
                  >
                    {terrenoAtivo.resultado.coordenadas.length}
                  </p>
                </div>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      textTransform: "uppercase",
                      fontWeight: "600",
                    }}
                  >
                    Segmentos
                  </span>
                  <p
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      margin: "4px 0 0 0",
                      color: "#0f172a",
                    }}
                  >
                    {terrenoAtivo.resultado.segmentos.length}
                  </p>
                </div>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      textTransform: "uppercase",
                      fontWeight: "600",
                    }}
                  >
                    Medidas Conv.
                  </span>
                  <p
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      margin: "4px 0 0 0",
                      color: "#0f172a",
                    }}
                  >
                    {terrenoAtivo.resultado.medidas.length}
                  </p>
                </div>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      textTransform: "uppercase",
                      fontWeight: "600",
                    }}
                  >
                    Área Declarada
                  </span>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: "700",
                      margin: "6px 0 0 0",
                      color: "#0f172a",
                    }}
                  >
                    {terrenoAtivo.resultado.areaTotal
                      ? `${terrenoAtivo.resultado.areaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} m²`
                      : "Não informada"}
                  </p>
                </div>
              </div>

              {/* Sub-Abas do Terreno */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  borderBottom: "1px solid #e5e7eb",
                  marginBottom: "16px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setAbaAtivaDetalhe("dados")}
                  style={{
                    padding: "8px 16px",
                    background: "none",
                    border: "none",
                    borderBottom: `2px solid ${abaAtivaDetalhe === "dados" ? "#2563eb" : "transparent"}`,
                    color: abaAtivaDetalhe === "dados" ? "#2563eb" : "#6b7280",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Informações Extraídas
                </button>
                <button
                  type="button"
                  onClick={() => setAbaAtivaDetalhe("validacao")}
                  style={{
                    padding: "8px 16px",
                    background: "none",
                    border: "none",
                    borderBottom: `2px solid ${abaAtivaDetalhe === "validacao" ? "#2563eb" : "transparent"}`,
                    color:
                      abaAtivaDetalhe === "validacao" ? "#2563eb" : "#6b7280",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Validação Geométrica
                </button>
                <button
                  type="button"
                  onClick={() => setAbaAtivaDetalhe("texto")}
                  style={{
                    padding: "8px 16px",
                    background: "none",
                    border: "none",
                    borderBottom: `2px solid ${abaAtivaDetalhe === "texto" ? "#2563eb" : "transparent"}`,
                    color: abaAtivaDetalhe === "texto" ? "#2563eb" : "#6b7280",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Texto Original / Edição
                </button>
              </div>

              {/* SUB-ABA 1: DADOS */}
              {abaAtivaDetalhe === "dados" && (
                <div>
                  {terrenoAtivo.resultado.coordenadas.length > 0 && (
                    <div style={{ marginBottom: "20px" }}>
                      <h4
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          margin: "0 0 8px 0",
                        }}
                      >
                        Coordenadas Identificadas (
                        {terrenoAtivo.resultado.coordenadas.length})
                      </h4>
                      <div style={{ overflowX: "auto" }}>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "13px",
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                background: "#f8fafc",
                                borderBottom: "1px solid #e2e8f0",
                                textAlign: "left",
                              }}
                            >
                              <th style={{ padding: "8px 12px" }}>Vértice</th>
                              <th style={{ padding: "8px 12px" }}>Norte (Y)</th>
                              <th style={{ padding: "8px 12px" }}>Este (X)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {terrenoAtivo.resultado.coordenadas.map((c, i) => (
                              <tr
                                key={i}
                                style={{ borderBottom: "1px solid #f1f5f9" }}
                              >
                                <td
                                  style={{
                                    padding: "8px 12px",
                                    fontWeight: "600",
                                  }}
                                >
                                  {c.vertice}
                                </td>
                                <td
                                  style={{
                                    padding: "8px 12px",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {c.norte.toFixed(4)}
                                </td>
                                <td
                                  style={{
                                    padding: "8px 12px",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {c.este.toFixed(4)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {terrenoAtivo.resultado.segmentos.length > 0 && (
                    <div style={{ marginBottom: "20px" }}>
                      <h4
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          margin: "0 0 8px 0",
                        }}
                      >
                        Segmentos do Perímetro (
                        {terrenoAtivo.resultado.segmentos.length})
                      </h4>
                      <div style={{ overflowX: "auto" }}>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "13px",
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                background: "#f8fafc",
                                borderBottom: "1px solid #e2e8f0",
                                textAlign: "left",
                              }}
                            >
                              <th style={{ padding: "8px 12px" }}>#</th>
                              <th style={{ padding: "8px 12px" }}>Destino</th>
                              <th style={{ padding: "8px 12px" }}>Tipo</th>
                              <th style={{ padding: "8px 12px" }}>
                                Distância / Desenv.
                              </th>
                              <th style={{ padding: "8px 12px" }}>
                                Azimute / Curvatura
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {terrenoAtivo.resultado.segmentos.map((s, i) => (
                              <tr
                                key={i}
                                style={{ borderBottom: "1px solid #f1f5f9" }}
                              >
                                <td
                                  style={{
                                    padding: "8px 12px",
                                    color: "#64748b",
                                  }}
                                >
                                  {i + 1}
                                </td>
                                <td
                                  style={{
                                    padding: "8px 12px",
                                    fontWeight: "600",
                                  }}
                                >
                                  {s.destino}
                                </td>
                                <td style={{ padding: "8px 12px" }}>
                                  <span
                                    style={{
                                      background:
                                        s.geometria === "curva"
                                          ? "#fdf4ff"
                                          : "#f0fdf4",
                                      color:
                                        s.geometria === "curva"
                                          ? "#a21caf"
                                          : "#15803d",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {s.geometria.toUpperCase()}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    padding: "8px 12px",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {s.distancia !== undefined
                                    ? `${s.distancia.toFixed(2)} m`
                                    : s.desenvolvimento !== undefined
                                      ? `D = ${s.desenvolvimento.toFixed(2)} m`
                                      : "—"}
                                </td>
                                <td
                                  style={{
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                  }}
                                >
                                  {s.azimute
                                    ? `Az ${s.azimute.graus}°${s.azimute.minutos}'${s.azimute.segundos}"`
                                    : s.raio
                                      ? `Raio = ${s.raio.toFixed(2)} m`
                                      : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {terrenoAtivo.resultado.medidas.length > 0 && (
                    <div style={{ marginBottom: "20px" }}>
                      <h4
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          margin: "0 0 8px 0",
                        }}
                      >
                        Medidas Convencionais (
                        {terrenoAtivo.resultado.medidas.length})
                      </h4>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: "10px",
                        }}
                      >
                        {terrenoAtivo.resultado.medidas.map((m, i) => (
                          <div
                            key={i}
                            style={{
                              background: "#f8fafc",
                              padding: "10px 14px",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#64748b",
                                textTransform: "capitalize",
                              }}
                            >
                              {m.descricao}
                            </span>
                            <p
                              style={{
                                margin: "2px 0 0 0",
                                fontSize: "16px",
                                fontWeight: "700",
                                color: "#0f172a",
                              }}
                            >
                              {m.valor.toFixed(2)} m
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-ABA 2: VALIDAÇÃO */}
              {abaAtivaDetalhe === "validacao" && (
                <div>
                  <div
                    style={{
                      background: validacaoAtiva.resumo.permiteGeracaoDXF
                        ? "#f0fdf4"
                        : "#fef2f2",
                      border: `1px solid ${validacaoAtiva.resumo.permiteGeracaoDXF ? "#bbf7d0" : "#fecaca"}`,
                      borderRadius: "8px",
                      padding: "14px 18px",
                      marginBottom: "16px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "700",
                        color: validacaoAtiva.resumo.permiteGeracaoDXF
                          ? "#15803d"
                          : "#991b1b",
                      }}
                    >
                      {validacaoAtiva.resumo.permiteGeracaoDXF
                        ? validacaoAtiva.resumo.dxfAproximado
                          ? "✓ Terreno apto para geração de DXF (Representação Esquemática/Aproximada)"
                          : "✓ Terreno apto para geração de DXF preciso com coordenadas reais"
                        : "✕ Dados insuficientes para reconstrução gráfica"}
                    </p>
                  </div>

                  {validacaoAtiva.diagnosticos.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {validacaoAtiva.diagnosticos.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "6px",
                            border: "1px solid",
                            backgroundColor:
                              d.severidade === "erro"
                                ? "#fef2f2"
                                : d.severidade === "aviso"
                                  ? "#fffbeb"
                                  : "#eff6ff",
                            borderColor:
                              d.severidade === "erro"
                                ? "#fecaca"
                                : d.severidade === "aviso"
                                  ? "#fde68a"
                                  : "#bfdbfe",
                            color:
                              d.severidade === "erro"
                                ? "#991b1b"
                                : d.severidade === "aviso"
                                  ? "#92400e"
                                  : "#1e40af",
                            fontSize: "13px",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "700",
                              textTransform: "uppercase",
                              fontSize: "11px",
                              marginRight: "6px",
                            }}
                          >
                            [{d.severidade}]
                          </span>
                          <span>{d.mensagem}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "#6b7280", fontSize: "13px" }}>
                      Nenhum aviso ou inconformidade geométrica detectada.
                    </p>
                  )}
                </div>
              )}

              {/* SUB-ABA 3: TEXTO / EDIÇÃO */}
              {abaAtivaDetalhe === "texto" && (
                <div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Você pode ajustar o texto transcrito desta descrição se
                    houver algum erro de OCR e recalcular imediatamente:
                  </p>
                  <textarea
                    rows={10}
                    value={terrenoAtivo.textoOriginal}
                    onChange={(e) =>
                      handleAtualizarTextoTerreno(
                        terrenoAtivo.id,
                        e.target.value,
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      fontFamily: "monospace",
                      fontSize: "13px",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleAtualizarTextoTerreno(
                          terrenoAtivo.id,
                          terrenoAtivo.textoOriginal,
                        )
                      }
                      style={{
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      🔄 Recalcular este Terreno
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
