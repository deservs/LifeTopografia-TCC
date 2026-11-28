import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { useLocation, useNavigate } from "react-router-dom";

import type {
  PagamentoProps,
  PaymentApprovedDetails,
  PaymentBrickSubmitPayload,
  PaymentErrorDetails,
  PaymentUiState,
  PixPaymentDetails,
} from "./pagamento.types";
import "./pagamento.css";

type PaymentComponentProps = ComponentProps<typeof Payment>;
type PaymentInitialization = PaymentComponentProps["initialization"];
type PaymentCustomization = PaymentComponentProps["customization"];
type PaymentOnSubmit = PaymentComponentProps["onSubmit"];
type PaymentOnError = NonNullable<PaymentComponentProps["onError"]>;

interface PagamentoRouteState {
  idPedido?: string;
  descricaoServico?: string;
  valorPedido?: number;
  payerEmail?: string;
}

const DEFAULT_ORDER_ID = "LT-2026-0101";
const DEFAULT_SERVICE_DESCRIPTION =
  "Levantamento Planialtimétrico Cadastral + Geração de DXF (SIRGAS 2000) e ART";
const DEFAULT_ORDER_AMOUNT = 2450;

const MP_PUBLIC_KEY = (
  import.meta.env.VITE_MP_PUBLIC_KEY ||
  import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ||
  ""
).trim();

const isPublicKeyConfigured =
  MP_PUBLIC_KEY.length > 0 && !MP_PUBLIC_KEY.startsWith("placeholder");

let isMercadoPagoInitialized = false;

function ensureMercadoPagoInitialized() {
  if (!isPublicKeyConfigured || isMercadoPagoInitialized) {
    return;
  }
  initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
  isMercadoPagoInitialized = true;
}

function formatBRL(value: number): string {
  const safeValue = Number.isFinite(value) && value >= 0 ? value : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(safeValue);
}

function resolveQrCodeSrc(qrCodeBase64?: string): string | null {
  if (!qrCodeBase64) return null;
  const trimmed = qrCodeBase64.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) return trimmed;
  return `data:image/png;base64,${trimmed}`;
}

export default function Pagamento({
  isOpen = true,
  onClose,
  idPedido,
  descricaoServico,
  valorPedido,
  payerEmail,
  onSubmitPayment,
  onPaymentSuccess,
  onPaymentError,
  initialUiState = "brick",
  initialPixData = null,
}: PagamentoProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = (location.state ?? null) as PagamentoRouteState | null;

  const resolvedOrderId =
    idPedido?.trim() || routeState?.idPedido?.trim() || DEFAULT_ORDER_ID;
  const resolvedDescription =
    descricaoServico?.trim() ||
    routeState?.descricaoServico?.trim() ||
    DEFAULT_SERVICE_DESCRIPTION;
  const rawAmount =
    valorPedido ?? routeState?.valorPedido ?? DEFAULT_ORDER_AMOUNT;
  const safeAmount =
    typeof rawAmount === "number" && Number.isFinite(rawAmount) && rawAmount > 0
      ? Number(rawAmount.toFixed(2))
      : DEFAULT_ORDER_AMOUNT;
  const resolvedEmail =
    payerEmail?.trim() || routeState?.payerEmail?.trim() || undefined;

  const [uiState, setUiState] = useState<PaymentUiState>(initialUiState);
  const [isBrickReady, setIsBrickReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brickResetKey, setBrickResetKey] = useState(0);
  const [pixData, setPixData] = useState<PixPaymentDetails | null>(
    initialPixData,
  );
  const [approvedData, setApprovedData] =
    useState<PaymentApprovedDetails | null>(null);
  const [errorData, setErrorData] = useState<PaymentErrorDetails | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  const rawId = useId().replace(/:/g, "");
  const brickContainerId = `mp-payment-brick-${rawId}-${brickResetKey}`;

  if (isOpen && isPublicKeyConfigured) {
    ensureMercadoPagoInitialized();
  }

  const latestPropsRef = useRef({
    idPedido: resolvedOrderId,
    valorPedido: safeAmount,
    onSubmitPayment,
    onPaymentSuccess,
    onPaymentError,
  });

  useEffect(() => {
    latestPropsRef.current = {
      idPedido: resolvedOrderId,
      valorPedido: safeAmount,
      onSubmitPayment,
      onPaymentSuccess,
      onPaymentError,
    };
  }, [
    resolvedOrderId,
    safeAmount,
    onSubmitPayment,
    onPaymentSuccess,
    onPaymentError,
  ]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/chat");
    }
  }, [onClose, navigate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!pixCopied) return;
    const timer = window.setTimeout(() => setPixCopied(false), 2600);
    return () => window.clearTimeout(timer);
  }, [pixCopied]);

  const brickInitialization = useMemo<PaymentInitialization>(
    () => ({
      amount: safeAmount,
      ...(resolvedEmail ? { payer: { email: resolvedEmail } } : {}),
    }),
    [safeAmount, resolvedEmail],
  );

  const brickCustomization = useMemo<PaymentCustomization>(
    () => ({
      paymentMethods: {
        creditCard: "all",
        debitCard: "all",
        bankTransfer: "all",
        maxInstallments: 12,
      },
      visual: {
        hideFormTitle: false,
        style: {
          theme: "dark",
          customVariables: {
            textPrimaryColor: "#f8fafc",
            textSecondaryColor: "#94a3b8",
            inputBackgroundColor: "#0f1c3f",
            formBackgroundColor: "#0b132b",
            baseColor: "#0b50bd",
            baseColorFirstVariant: "#00a2ff",
            baseColorSecondVariant: "#083d93",
            buttonTextColor: "#ffffff",
            errorColor: "#f87171",
            successColor: "#00c853",
            outlinePrimaryColor: "#00a2ff",
            outlineSecondaryColor: "#1e3a5f",
            borderRadiusSmall: "8px",
            borderRadiusMedium: "12px",
            borderRadiusLarge: "16px",
            fontSizeSmall: "13px",
            fontSizeMedium: "14px",
            fontSizeLarge: "16px",
            fontWeightNormal: "400",
            fontWeightSemiBold: "600",
            formPadding: "4px",
          },
        },
      },
    }),
    [],
  );

  const handleBrickReady = useCallback(() => {
    setIsBrickReady(true);
  }, []);

  const handleBrickError = useCallback<PaymentOnError>((brickError) => {
    setIsBrickReady(true);
    setIsSubmitting(false);

    const details: PaymentErrorDetails = {
      title: "Falha ao carregar o checkout",
      message:
        brickError.message ||
        "Não foi possível inicializar o formulário seguro do Mercado Pago.",
      cause: brickError.cause,
    };

    if (brickError.type === "critical") {
      setErrorData(details);
      setUiState("error");
    }

    latestPropsRef.current.onPaymentError?.(details);
  }, []);

  const handleBrickSubmit = useCallback<PaymentOnSubmit>(async (param) => {
    const {
      idPedido: currentOrderId,
      valorPedido: currentAmount,
      onSubmitPayment: submitHandler,
      onPaymentSuccess: successHandler,
      onPaymentError: errorHandler,
    } = latestPropsRef.current;

    const payload: PaymentBrickSubmitPayload = {
      idPedido: currentOrderId,
      valorPedido: currentAmount,
      paymentType: param.paymentType,
      selectedPaymentMethod: param.selectedPaymentMethod,
      formData: param.formData as unknown as Record<string, unknown>,
    };

    if (!submitHandler) {
      const details: PaymentErrorDetails = {
        title: "Integração de cobrança pendente",
        message:
          "Os dados foram validados com segurança pelo Mercado Pago, mas o manipulador de envio da API (onSubmitPayment) ainda não foi conectado.",
        code: "NO_SUBMIT_HANDLER",
      };
      setErrorData(details);
      setUiState("error");
      errorHandler?.(details);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitHandler(payload);

      if (!result) {
        return;
      }

      if (result.status === "pending_pix") {
        setPixData(result.pix);
        setPixCopied(false);
        setUiState("pix");
        return;
      }

      if (result.status === "approved") {
        const approved: PaymentApprovedDetails = {
          idPedido: currentOrderId,
          valorPedido: currentAmount,
          paymentId: result.paymentId,
          paymentMethodLabel:
            result.paymentMethodLabel ||
            (param.selectedPaymentMethod === "bank_transfer"
              ? "PIX"
              : "Cartão"),
          approvedAt: result.approvedAt,
        };
        setApprovedData(approved);
        setUiState("approved");
        successHandler?.(approved);
        return;
      }

      const rejected: PaymentErrorDetails = {
        title: "Pagamento não autorizado",
        message:
          result.message ||
          "A operadora recusou a transação. Verifique os dados ou tente outro meio de pagamento.",
        code: result.code,
      };
      setErrorData(rejected);
      setUiState("error");
      errorHandler?.(rejected);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro de comunicação ao processar o pagamento. Tente novamente.";
      const failed: PaymentErrorDetails = {
        title: "Erro ao processar pagamento",
        message,
      };
      setErrorData(failed);
      setUiState("error");
      errorHandler?.(failed);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleRetryPayment = useCallback(() => {
    setErrorData(null);
    setPixData(null);
    setPixCopied(false);
    setIsBrickReady(false);
    setIsSubmitting(false);
    setUiState("brick");
    setBrickResetKey((prev) => prev + 1);
  }, []);

  const handleCopyPixCode = useCallback(async () => {
    const code = pixData?.qrCode?.trim();
    if (!code) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const tempInput = document.createElement("textarea");
        tempInput.value = code;
        tempInput.setAttribute("readonly", "");
        tempInput.style.position = "fixed";
        tempInput.style.opacity = "0";
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }
      setPixCopied(true);
    } catch {
      setPixCopied(false);
    }
  }, [pixData?.qrCode]);

  if (!isOpen) {
    return null;
  }

  const formattedAmount = formatBRL(safeAmount);
  const qrCodeSrc = resolveQrCodeSrc(pixData?.qrCodeBase64);

  return (
    <>
      <title>Pagamento Seguro - Life Topografia</title>
      <meta
        name="description"
        content="Finalize o pagamento do seu serviço topográfico via Mercado Pago (Cartão ou PIX)."
      />

      <div
        className="mp-checkout-overlay"
        role="presentation"
        onClick={handleClose}
      >
        <section
          className="mp-checkout-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mp-checkout-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="mp-checkout-header">
            <div className="mp-checkout-heading">
              <span className="mp-brand-pill">
                LIFE TOPOGRAFIA • CHECKOUT MERCADO PAGO
              </span>
              <h1 id="mp-checkout-title">Pagamento do Serviço Técnico</h1>
            </div>

            <button
              type="button"
              className="mp-close-btn"
              onClick={handleClose}
              aria-label="Fechar janela de pagamento"
              title="Fechar"
            >
              ✕
            </button>
          </header>

          <div className="mp-checkout-body">
            <div className="mp-checkout-grid">
              {/* Coluna A: Resumo do Pedido (somente leitura) */}
              <aside
                className="mp-order-summary"
                aria-labelledby="mp-summary-title"
              >
                <div className="mp-summary-top">
                  <span className="mp-order-badge">
                    Pedido #{resolvedOrderId}
                  </span>
                  <h2 id="mp-summary-title">Resumo do Pedido</h2>
                </div>

                <div className="mp-service-box">
                  <span className="mp-field-caption">Serviço Contratado</span>
                  <p className="mp-service-description">
                    {resolvedDescription}
                  </p>
                </div>

                <ul className="mp-trust-list">
                  <li>
                    <span aria-hidden="true">📐</span>
                    <span>
                      Conversão DXF (SIRGAS 2000) e entregáveis técnicos
                      vinculados ao pedido
                    </span>
                  </li>
                  <li>
                    <span aria-hidden="true">⚡</span>
                    <span>Aprovação imediata via PIX ou Cartão em até 12x</span>
                  </li>
                  <li>
                    <span aria-hidden="true">🔒</span>
                    <span>
                      Ambiente criptografado Mercado Pago (conformidade LGPD /
                      PCI)
                    </span>
                  </li>
                </ul>

                <div className="mp-total-card" aria-live="polite">
                  <span className="mp-total-label">Total a pagar</span>
                  <strong className="mp-total-value">{formattedAmount}</strong>
                </div>
              </aside>

              {/* Coluna B: Gateway Mercado Pago & Estados Visuais */}
              <div className="mp-gateway-panel">
                {uiState === "brick" && (
                  <div className="mp-brick-wrapper">
                    <div className="mp-gateway-header">
                      <h2>Escolha como deseja pagar</h2>
                      <p>
                        Preencha os dados diretamente no ambiente protegido do
                        Mercado Pago.
                      </p>
                    </div>

                    {!isPublicKeyConfigured ? (
                      <div className="mp-config-alert" role="alert">
                        <strong>Chave pública não configurada</strong>
                        <p>
                          Defina <code>VITE_MP_PUBLIC_KEY</code> no arquivo{" "}
                          <code>.env</code> para habilitar o Payment Brick do
                          Mercado Pago.
                        </p>
                      </div>
                    ) : (
                      <div className="mp-brick-stage">
                        {!isBrickReady && (
                          <div
                            className="mp-brick-skeleton"
                            role="status"
                            aria-live="polite"
                            aria-label="Carregando formulário de pagamento"
                          >
                            <div className="mp-skeleton-spinner-row">
                              <span className="mp-spinner" aria-hidden="true" />
                              <span>
                                Conectando ao checkout seguro Mercado Pago…
                              </span>
                            </div>
                            <div className="mp-skeleton-bar is-lg" />
                            <div className="mp-skeleton-bar is-md" />
                            <div className="mp-skeleton-row">
                              <div className="mp-skeleton-bar" />
                              <div className="mp-skeleton-bar" />
                            </div>
                            <div className="mp-skeleton-bar is-btn" />
                          </div>
                        )}

                        <div
                          className={`mp-brick-mount ${isBrickReady ? "is-ready" : "is-loading"}`}
                        >
                          <Payment
                            key={brickResetKey}
                            id={brickContainerId}
                            initialization={brickInitialization}
                            customization={brickCustomization}
                            locale="pt"
                            onReady={handleBrickReady}
                            onError={handleBrickError}
                            onSubmit={handleBrickSubmit}
                          />
                        </div>

                        {isSubmitting && (
                          <div
                            className="mp-submitting-overlay"
                            role="status"
                            aria-live="polite"
                          >
                            <span className="mp-spinner" aria-hidden="true" />
                            <span>Validando pagamento com segurança…</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {uiState === "pix" && pixData && (
                  <div className="mp-state-card mp-pix-state" role="status">
                    <span className="mp-state-pill is-pix">
                      PIX GERADO • AGUARDANDO PAGAMENTO
                    </span>
                    <h2>Escaneie o QR Code para pagar</h2>
                    <p className="mp-state-subtitle">
                      Abra o aplicativo do seu banco, escolha pagar via PIX e
                      escaneie o código abaixo ou use o Copia e Cola.
                    </p>

                    <div className="mp-pix-qr-frame">
                      {qrCodeSrc ? (
                        <img
                          src={qrCodeSrc}
                          alt={`QR Code PIX para o pedido ${resolvedOrderId}`}
                          className="mp-pix-qr-image"
                        />
                      ) : (
                        <div className="mp-pix-qr-fallback">
                          <span aria-hidden="true">💠</span>
                          <p>Use o código PIX Copia e Cola abaixo</p>
                        </div>
                      )}
                    </div>

                    {pixData.expiresAt && (
                      <p className="mp-pix-expiry">
                        Válido até:{" "}
                        <strong className="mp-nowrap">
                          {pixData.expiresAt}
                        </strong>
                      </p>
                    )}

                    <div className="mp-pix-copy-box">
                      <span className="mp-field-caption">
                        Código PIX (Copia e Cola)
                      </span>
                      <div className="mp-pix-code-preview">
                        <code>{pixData.qrCode}</code>
                      </div>
                      <button
                        type="button"
                        className={`mp-btn-primary ${pixCopied ? "is-copied" : ""}`}
                        onClick={handleCopyPixCode}
                      >
                        {pixCopied
                          ? "✓ Código PIX copiado!"
                          : "Copiar código PIX"}
                      </button>
                    </div>

                    <div className="mp-state-actions">
                      {pixData.ticketUrl && (
                        <a
                          href={pixData.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mp-btn-secondary"
                        >
                          Abrir comprovante PIX ↗
                        </a>
                      )}
                      <button
                        type="button"
                        className="mp-btn-ghost"
                        onClick={handleRetryPayment}
                      >
                        Escolher outro meio de pagamento
                      </button>
                    </div>
                  </div>
                )}

                {uiState === "approved" && (
                  <div
                    className="mp-state-card mp-approved-state"
                    role="status"
                    aria-live="polite"
                  >
                    <div
                      className="mp-status-icon is-success"
                      aria-hidden="true"
                    >
                      ✓
                    </div>
                    <span className="mp-state-pill is-success">
                      PAGAMENTO CONFIRMADO
                    </span>
                    <h2>Pagamento aprovado!</h2>
                    <p className="mp-state-subtitle">
                      Seu pagamento foi confirmado pelo Mercado Pago. Nossa
                      equipe técnica já recebeu a atualização do pedido.
                    </p>

                    <dl className="mp-receipt-list">
                      <div>
                        <dt>Pedido</dt>
                        <dd className="mp-nowrap">#{resolvedOrderId}</dd>
                      </div>
                      <div>
                        <dt>Valor pago</dt>
                        <dd className="mp-nowrap">
                          {formatBRL(approvedData?.valorPedido ?? safeAmount)}
                        </dd>
                      </div>
                      {approvedData?.paymentMethodLabel && (
                        <div>
                          <dt>Método</dt>
                          <dd>{approvedData.paymentMethodLabel}</dd>
                        </div>
                      )}
                      {approvedData?.paymentId && (
                        <div>
                          <dt>ID da transação</dt>
                          <dd className="mp-nowrap">
                            {approvedData.paymentId}
                          </dd>
                        </div>
                      )}
                    </dl>

                    <div className="mp-state-actions">
                      <button
                        type="button"
                        className="mp-btn-primary"
                        onClick={handleClose}
                      >
                        Voltar ao atendimento
                      </button>
                    </div>
                  </div>
                )}

                {uiState === "error" && (
                  <div className="mp-state-card mp-error-state" role="alert">
                    <div className="mp-status-icon is-error" aria-hidden="true">
                      !
                    </div>
                    <span className="mp-state-pill is-error">
                      ATENÇÃO NO PAGAMENTO
                    </span>
                    <h2>
                      {errorData?.title ||
                        "Não foi possível concluir o pagamento"}
                    </h2>
                    <p className="mp-state-subtitle">
                      {errorData?.message ||
                        "Ocorreu uma recusa ou falha temporária ao processar sua transação."}
                    </p>

                    {(errorData?.code || errorData?.cause) && (
                      <p className="mp-error-code">
                        Referência:{" "}
                        <code>{errorData.code || errorData.cause}</code>
                      </p>
                    )}

                    <div className="mp-state-actions">
                      <button
                        type="button"
                        className="mp-btn-primary"
                        onClick={handleRetryPayment}
                      >
                        Tentar novamente
                      </button>
                      <button
                        type="button"
                        className="mp-btn-ghost"
                        onClick={handleClose}
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
