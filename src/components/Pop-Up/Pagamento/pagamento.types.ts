export type PaymentUiState = "brick" | "pix" | "approved" | "error";

export interface PaymentBrickSubmitPayload {
  idPedido: string;
  valorPedido: number;
  paymentType: string;
  selectedPaymentMethod: string;
  formData: Record<string, unknown>;
}

export interface PixPaymentDetails {
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expiresAt?: string;
  paymentId?: string;
}

export interface PaymentApprovedDetails {
  idPedido: string;
  valorPedido: number;
  paymentId?: string;
  paymentMethodLabel?: string;
  approvedAt?: string;
}

export interface PaymentErrorDetails {
  title?: string;
  message: string;
  code?: string;
  cause?: string;
}

export type PaymentSubmissionResult =
  | {
      status: "approved";
      paymentId?: string;
      paymentMethodLabel?: string;
      approvedAt?: string;
    }
  | {
      status: "pending_pix";
      pix: PixPaymentDetails;
    }
  | {
      status: "rejected" | "error";
      message: string;
      code?: string;
    };

export interface PagamentoProps {
  isOpen?: boolean;
  onClose?: () => void;
  idPedido?: string;
  descricaoServico?: string;
  valorPedido?: number;
  payerEmail?: string;
  onSubmitPayment?: (
    payload: PaymentBrickSubmitPayload,
  ) => Promise<PaymentSubmissionResult | void>;
  onPaymentSuccess?: (details: PaymentApprovedDetails) => void;
  onPaymentError?: (error: PaymentErrorDetails) => void;
  initialUiState?: PaymentUiState;
  initialPixData?: PixPaymentDetails | null;
}
