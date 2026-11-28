export type MfaMode = "enroll" | "verify";

export interface MdaAtivateProps {
  mode: MfaMode;
  qrCodeUrl?: string;
  secretKey?: string;
  isLoading?: boolean;
  errorMessage?: string;
  onVerifyCode: (code: string) => void;
  onCancel?: () => void;
}
