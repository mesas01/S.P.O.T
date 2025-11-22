const envBaseUrl = import.meta.env.VITE_BACKEND_URL;
const backendBaseUrl = (envBaseUrl || "http://localhost:4000").replace(/\/$/, "");

const defaultHeaders = {
  "Content-Type": "application/json",
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${backendBaseUrl}${path}`, {
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message = errorPayload?.error || response.statusText;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export interface CreateEventPayload {
  creatorSecret: string;
  creator: string;
  eventName: string;
  eventDate: number;
  location: string;
  description: string;
  maxPoaps: number;
  claimStart: number;
  claimEnd: number;
  metadataUri: string;
  imageUrl: string;
}

export interface ClaimEventPayload {
  claimer: string;
  eventId: number;
  payerSecret?: string;
}

export interface BackendTxResponse {
  txHash: string;
  signedEnvelope: string;
  rpcResponse?: Record<string, unknown>;
}

export function createEventRequest(payload: CreateEventPayload) {
  return request<BackendTxResponse>("/events/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function claimEventRequest(payload: ClaimEventPayload) {
  return request<BackendTxResponse>("/events/claim", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getBackendBaseUrl() {
  return backendBaseUrl;
}


