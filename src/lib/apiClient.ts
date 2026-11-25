import { supabase } from "./supabase/supabaseClient";

export type ApiErrorKind =
  | "unauthenticated"
  | "forbidden"
  | "validation_error"
  | "server_error"
  | "network_error";

export type ApiFieldErrors = Record<string, string[] | undefined>;

export type ApiResponse<T> =
  | {
      ok: true;
      data: T;
      status: number;
      pagination?: unknown;
    }
  | {
      ok: false;
      errorKind: ApiErrorKind;
      status?: number;
      code?: string;
      message: string;
      fieldErrors?: ApiFieldErrors;
    };

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  auth?: boolean;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  record: UnknownRecord,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readFieldErrors(payload: UnknownRecord): ApiFieldErrors | undefined {
  const candidate = payload.fieldErrors ?? payload.errors;
  if (!isRecord(candidate)) return undefined;

  const result: ApiFieldErrors = {};
  let hasAny = false;

  for (const [key, value] of Object.entries(candidate)) {
    if (Array.isArray(value)) {
      const messages = value.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      );
      if (messages.length > 0) {
        result[key] = messages;
        hasAny = true;
      }
    }
  }

  return hasAny ? result : undefined;
}

export async function parseSafeJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function mapHttpErrorResponse(
  status: number,
  payload: unknown,
): Extract<ApiResponse<never>, { ok: false }> {
  const record = isRecord(payload) ? payload : null;
  const serverMessage = record
    ? readString(record, ["message", "error"])
    : undefined;
  const code = record ? readString(record, ["code", "status"]) : undefined;
  const fieldErrors = record ? readFieldErrors(record) : undefined;

  if (status === 401) {
    return {
      ok: false,
      errorKind: "unauthenticated",
      status,
      code: code ?? "UNAUTHENTICATED",
      message:
        serverMessage ??
        "Sua sessão expirou ou é inválida. Faça login novamente.",
    };
  }

  if (status === 403) {
    return {
      ok: false,
      errorKind: "forbidden",
      status,
      code: code ?? "FORBIDDEN",
      message:
        serverMessage ?? "Você não tem permissão para realizar esta operação.",
    };
  }

  if (status === 400 || status === 422) {
    return {
      ok: false,
      errorKind: "validation_error",
      status,
      code: code ?? "VALIDATION_ERROR",
      message:
        serverMessage ?? "Os dados informados são inválidos. Revise os campos.",
      fieldErrors,
    };
  }

  return {
    ok: false,
    errorKind: "server_error",
    status,
    code: code ?? "SERVER_ERROR",
    message:
      serverMessage ??
      "Erro interno ao processar a solicitação. Tente novamente mais tarde.",
    fieldErrors,
  };
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {}, signal, auth = true } = options;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (auth) {
    const { data, error } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) {
      return {
        ok: false,
        errorKind: "unauthenticated",
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Usuário não autenticado.",
      };
    }
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let serializedBody: BodyInit | undefined;
  if (body !== undefined) {
    if (!requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }
    serializedBody =
      typeof body === "string" ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(path, {
      method,
      headers: requestHeaders,
      body: serializedBody,
      signal,
    });

    const payload = await parseSafeJson(response);

    if (!response.ok) {
      return mapHttpErrorResponse(response.status, payload);
    }

    if (!isRecord(payload)) {
      return {
        ok: false,
        errorKind: "server_error",
        status: response.status,
        code: "INVALID_RESPONSE",
        message:
          "O servidor retornou uma resposta inesperada. Tente novamente mais tarde.",
      };
    }

    if (payload.ok === false) {
      return mapHttpErrorResponse(response.status, payload);
    }

    const data = ("data" in payload ? payload.data : payload) as T;
    const pagination = "pagination" in payload ? payload.pagination : undefined;

    return {
      ok: true,
      data,
      status: response.status,
      pagination,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return {
      ok: false,
      errorKind: "network_error",
      code: "NETWORK_ERROR",
      message:
        "Falha de conexão com o servidor. Verifique sua rede e tente novamente.",
    };
  }
}
