const envBaseUrl = import.meta.env.VITE_BACKEND_URL;
const backendBaseUrl = (
  (envBaseUrl && envBaseUrl.trim()) ||
  "http://localhost:4000"
).replace(/\/$/, "");

const defaultHeaders = {
  "Content-Type": "application/json",
};

const maxAttempts = Math.max(
  1,
  Number(import.meta.env.VITE_BACKEND_MAX_ATTEMPTS ?? 3),
);
const retryBackoffMs = Math.max(
  0,
  Number(import.meta.env.VITE_BACKEND_RETRY_BACKOFF_MS ?? 400),
);
const requestTimeoutMs = Math.max(
  0,
  Number(import.meta.env.VITE_BACKEND_TIMEOUT_MS ?? 15000),
);
const retryableStatusCodes = new Set([408, 425, 429, 500, 502, 503, 504]);
const canUseAbortController = typeof AbortController !== "undefined";

function delay(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return retryableStatusCodes.has(status);
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  );
}

function isRetryableError(error: unknown) {
  return error instanceof TypeError || isAbortError(error);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const body = options.body;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  let attempt = 1;
  let lastError: unknown;

  while (attempt <= maxAttempts) {
    const headers = {
      ...(isFormData ? {} : defaultHeaders),
      ...(options.headers || {}),
    };

    let controller: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const shouldTimeout = requestTimeoutMs > 0 && !options.signal;

    if (shouldTimeout && canUseAbortController) {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller?.abort(), requestTimeoutMs);
    }

    try {
      if (import.meta.env.DEV) {
        // High-signal debug for connection-level failures (NetworkError / Failed to fetch)
        console.debug("[backend] request", `${backendBaseUrl}${path}`);
      }
      const response = await fetch(`${backendBaseUrl}${path}`, {
        ...options,
        headers,
        signal: controller?.signal ?? options.signal,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const message = errorPayload?.error || response.statusText;

        if (isRetryableStatus(response.status) && attempt < maxAttempts) {
          await delay(retryBackoffMs * attempt);
          attempt += 1;
          continue;
        }

        throw new Error(message);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt >= maxAttempts) {
        throw error instanceof Error
          ? error
          : new Error("Backend request failed");
      }

      await delay(retryBackoffMs * attempt);
      attempt += 1;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Backend request failed");
}

export interface CreateEventPayload {
  creator: string;
  communityId?: number | string;
  eventName: string;
  eventDate: number;
  location: string;
  description: string;
  maxPoaps: number;
  claimStart: number;
  claimEnd: number;
  metadataUri: string;
  imageUrl?: string;
  imageFile?: File | null;
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

export interface CreateEventResponse extends BackendTxResponse {
  eventId?: number;
  imageUrl?: string;
}

export function createEventRequest(payload: CreateEventPayload) {
  const formData = new FormData();
  formData.append("creator", payload.creator);
  if (
    payload.communityId !== undefined &&
    payload.communityId !== null &&
    payload.communityId !== ""
  ) {
    formData.append("communityId", payload.communityId.toString());
  }
  formData.append("eventName", payload.eventName);
  formData.append("eventDate", payload.eventDate.toString());
  formData.append("location", payload.location);
  formData.append("description", payload.description);
  formData.append("maxPoaps", payload.maxPoaps.toString());
  formData.append("claimStart", payload.claimStart.toString());
  formData.append("claimEnd", payload.claimEnd.toString());
  formData.append("metadataUri", payload.metadataUri);
  if (typeof payload.imageUrl === "string") {
    formData.append("imageUrl", payload.imageUrl);
  }
  if (payload.imageFile) {
    formData.append("image", payload.imageFile);
  }
  return request<CreateEventResponse>("/events/create", {
    method: "POST",
    body: formData,
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

export async function fetchMintedCount(eventId: number) {
  return request<{ mintedCount: number }>(`/events/${eventId}/minted-count`);
}

export interface OnchainEventSummary {
  eventId: number;
  name: string;
  date: number;
  location: string;
  description: string;
  maxSpots: number;
  claimStart: number;
  claimEnd: number;
  metadataUri?: string;
  imageUrl: string;
  creator: string;
  communityId?: number;
  mintedCount: number;
  tokenId?: number;
}

export interface FetchOnchainEventsOptions {
  creator?: string;
  signal?: AbortSignal;
  forceRpc?: boolean;
}

type FetchOnchainEventsArg = string | FetchOnchainEventsOptions | undefined;

export async function fetchOnchainEvents(arg?: FetchOnchainEventsArg) {
  let creator: string | undefined;
  let signal: AbortSignal | undefined;

  const query = new URLSearchParams();
  if (typeof arg === "string") {
    creator = arg;
  } else if (typeof arg === "object" && arg !== null) {
    creator = arg.creator;
    signal = arg.signal;
    if (arg.forceRpc) {
      query.set("forceRpc", "1");
    }
  }
  if (creator) {
    query.set("creator", creator);
  }

  const queryString = query.toString();
  const path = queryString
    ? `/events/onchain?${queryString}`
    : "/events/onchain";

  const response = await request<{ events: OnchainEventSummary[] }>(
    path,
    signal ? { signal } : undefined,
  );
  return response.events;
}

export type ClaimedEventSummary = OnchainEventSummary;

export async function fetchClaimedEventsByClaimer(
  claimer: string,
  signal?: AbortSignal,
) {
  if (!claimer) {
    throw new Error("claimer is required");
  }
  const response = await request<{ events: ClaimedEventSummary[] }>(
    `/claimers/${encodeURIComponent(claimer)}/events`,
    signal ? { signal } : undefined,
  );
  return response.events;
}

export interface CommunityMember {
  id: number;
  communityId: number;
  address: string;
  joinedAt: string;
}

export interface Community {
  id: number;
  name: string;
  country: string;
  description: string;
  imageUrl: string;
  creatorAddress: string;
  createdAt: string;
  updatedAt: string;
  members: CommunityMember[];
}

export async function fetchCommunities() {
  const response = await request<{ communities: Community[] }>("/communities");
  return response.communities;
}

export async function createCommunityRequest(payload: {
  name: string;
  country: string;
  description: string;
  imageUrl: string;
  creatorAddress: string;
}) {
  return request<{ community: Community }>("/communities", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function joinCommunityRequest(
  communityId: number,
  address: string,
) {
  return request<{ ok: boolean }>(`/communities/${communityId}/join`, {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}

export async function leaveCommunityRequest(
  communityId: number,
  address: string,
) {
  return request<{ ok: boolean }>(`/communities/${communityId}/leave`, {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}

export async function updateCommunityRequest(
  communityId: number,
  payload: {
    creatorAddress: string;
    name?: string;
    country?: string;
    description?: string;
    imageUrl?: string;
  },
) {
  return request<{ community: Community }>(`/communities/${communityId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchCommunityEvents(communityId: number) {
  const response = await request<{ events: OnchainEventSummary[] }>(
    `/communities/${communityId}/events`,
  );
  return response.events;
}
