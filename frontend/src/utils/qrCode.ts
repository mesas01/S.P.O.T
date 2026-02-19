import QRCode from 'qrcode';

/**
 * Genera un código QR como Data URL (base64) para una URL dada
 * @param url - La URL que se codificará en el QR
 * @param options - Opciones adicionales para la generación del QR
 * @returns Promise<string> - Data URL del código QR generado
 */
export const generateQRCode = async (
  url: string,
  options?: {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }
): Promise<string> => {
  try {
    const qrDataURL = await QRCode.toDataURL(url, {
      width: options?.width || 300,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: 'M', // Medio nivel de corrección de errores
    });
    
    return qrDataURL;
  } catch (error) {
    console.error('Error generando código QR:', error);
    throw new Error('No se pudo generar el código QR');
  }
};

/**
 * Genera un código QR para un evento SPOT
 * @param eventId - ID único del evento
 * @param claimUrl - URL base para reclamar SPOTs (opcional)
 * @returns Promise<string> - Data URL del código QR generado
 */
export const generateEventQRCode = async (
  eventId: string,
  claimUrl?: string
): Promise<string> => {
  // Construir la URL de claim
  // En producción, esto vendría del contrato o configuración
  const baseUrl = claimUrl || window.location.origin;
  const claimLink = `${baseUrl}/mint?event=${eventId}`;
  
  return generateQRCode(claimLink, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
};

/**
 * Genera un código QR para un link único de evento
 * @param uniqueLink - Link único del evento
 * @returns Promise<string> - Data URL del código QR generado
 */
export const generateLinkQRCode = async (uniqueLink: string): Promise<string> => {
  return generateQRCode(uniqueLink, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
};
