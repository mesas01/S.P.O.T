type ClipboardValue = Record<string, unknown> | string | number | boolean | null | undefined;

const stringify = (payload: ClipboardValue): string => {
  if (payload === undefined || payload === null) {
    return "";
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload === "number" || typeof payload === "boolean") {
    return payload.toString();
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    console.error("Error serializando payload para clipboard:", error);
    return String(payload);
  }
};

export const buildErrorDetail = (error: unknown): string => {
  if (error instanceof Error) {
    return stringify({
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }

  if (typeof error === "string") {
    return error;
  }

  return stringify(error as ClipboardValue);
};

export const buildTxDetail = (
  txHash?: string,
  extra?: Record<string, unknown>,
): string => {
  return stringify({
    txHash,
    ...extra,
    generatedAt: new Date().toISOString(),
  });
};


