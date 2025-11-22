import React, { useEffect, useRef, useState } from "react";
import { Layout, Text, Button, Input } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import { claimEventRequest, fetchOnchainEvents } from "../util/backend";
import TldrCard from "../components/layout/TldrCard";
import {
  mapEventToClaimedSpot,
  upsertClaimedSpot,
} from "../utils/claimedSpots";
import { buildErrorDetail, buildTxDetail } from "../utils/notificationHelpers";

const Mint: React.FC = () => {
  const { address } = useWallet();
  const isConnected = !!address;
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [activeMethod, setActiveMethod] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState("");
  const [codeValue, setCodeValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const claimPersistControllerRef = useRef<AbortController | null>(null);

  const handleMethodSelect = (method: string) => {
    setActiveMethod(method);
  };

  useEffect(() => {
    return () => {
      claimPersistControllerRef.current?.abort();
    };
  }, []);

  const persistClaimedSpotLocally = async (eventId: number) => {
    if (!address) return;

    claimPersistControllerRef.current?.abort();
    const controller = new AbortController();
    claimPersistControllerRef.current = controller;

    try {
      const events = await fetchOnchainEvents({ signal: controller.signal });
      const match = events.find((event) => event.eventId === eventId);
      if (match) {
        upsertClaimedSpot(address, mapEventToClaimedSpot(match));
        return;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" || /aborted/i.test(error.message))
      ) {
        console.info("Persistencia del claim cancelada (abortada).");
        return;
      }
      console.warn("No se pudo obtener metadata del evento:", error);
      return;
    } finally {
      if (claimPersistControllerRef.current === controller) {
        claimPersistControllerRef.current = null;
      }
    }
  };

  const extractEventIdFromLink = (link: string): number | null => {
    try {
      const maybeUrl = new URL(link);
      const queryEvent = maybeUrl.searchParams.get("event");
      if (queryEvent) {
        const parsed = Number(queryEvent);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    } catch {
      // not a valid URL, continue
    }

    const match = link.match(/(\d+)/g);
    if (match) {
      const parsed = Number(match[match.length - 1]);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  };

  const extractEventIdFromCode = (code: string): number | null => {
    const digits = code.match(/(\d+)/);
    if (!digits) return null;
    const parsed = Number(digits[0]);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const executeClaim = async (eventId: number) => {
    if (!address) {
      showNotification({
        type: "error",
        title: "Wallet requerida",
        message: "Conecta tu wallet antes de reclamar el coleccionable",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await claimEventRequest({ claimer: address, eventId });
      showNotification({
        type: "success",
        title: "Reclamo enviado",
        message: "Tx enviada. Copia el detalle si necesitas compartirla.",
        copyText: buildTxDetail(response.txHash, { eventId, claimer: address }),
      });
      await persistClaimedSpotLocally(eventId);
      navigate("/");
    } catch (error: any) {
      console.error("Error al reclamar SPOT:", error);
      showNotification({
        type: "error",
        title: "Error al reclamar",
        message: "No se pudo completar el reclamo. Copia el detalle para soporte.",
        copyText: buildErrorDetail(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRScan = async () => {
    // TODO: Implementar escáner QR con eventId real
    showNotification({
      type: "info",
      title: "Próximamente",
      message: "El escaneo QR enviará el reclamo automático al backend.",
    });
  };

  const handleLinkClaim = async () => {
    if (!linkValue.trim()) {
      alert("Por favor, ingresa un link válido");
      return;
    }

    setIsProcessing(true);
    try {
      const eventId = extractEventIdFromLink(linkValue.trim());
      if (eventId === null) {
        showNotification({
          type: "error",
          title: "Link no válido",
          message: "No pudimos encontrar un ID de evento en el link",
        });
        return;
      }
      await executeClaim(eventId);
    } catch (error) {
      console.error("Error al reclamar SPOT:", error);
      showNotification({
        type: "error",
        title: "Error al reclamar",
        message: "No pudimos procesar el link. Copia el detalle para soporte.",
        copyText: buildErrorDetail(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCodeClaim = async () => {
    if (!codeValue.trim()) {
      alert("Por favor, ingresa un código válido");
      return;
    }

    setIsProcessing(true);
    try {
      const eventId = extractEventIdFromCode(codeValue.trim());
      if (eventId === null) {
        showNotification({
          type: "error",
          title: "Código inválido",
          message: "Incluye el ID numérico del evento en el código compartido",
        });
        return;
      }
      await executeClaim(eventId);
    } catch (error) {
      console.error("Error al reclamar SPOT:", error);
      showNotification({
        type: "error",
        title: "Error al reclamar",
        message: "No pudimos procesar el código. Copia el detalle para soporte.",
        copyText: buildErrorDetail(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeolocation = async () => {
    setIsProcessing(true);
    try {
      // TODO: Solicitar permisos de geolocalización y extraer eventId
      if (!navigator.geolocation) {
        showNotification({
          type: "error",
          title: "Sin geolocalización",
          message: "Tu navegador no soporta geolocalización",
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async () => {
          // TODO: Validar proximidad y ejecutar claim
          showNotification({
            type: "info",
            title: "Validación pendiente",
            message: "La validación por geolocalización aún no está implementada.",
          });
        },
        (error) => {
          console.error("Error de geolocalización:", error);
          showNotification({
            type: "error",
            title: "Error de ubicación",
            message: "No pudimos obtener tu posición. Copia el detalle para soporte.",
            copyText: buildErrorDetail(error),
          });
        }
      );
    } catch (error) {
      console.error("Error:", error);
      showNotification({
        type: "error",
        title: "Error al reclamar",
        message: "No pudimos completar la validación por geolocalización.",
        copyText: buildErrorDetail(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <Layout.Content>
        <Layout.Inset>
          <div className="min-h-screen bg-stellar-white py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="text-6xl mb-6">🔐</div>
              <Text as="h2" size="lg" className="text-2xl font-headline text-stellar-black mb-4">
                Conecta tu Wallet
              </Text>
            <Text as="p" size="md" className="text-stellar-black mb-6 font-body">
              Necesitas conectar tu wallet para reclamar un SPOT.
            </Text>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/")}
              className="bg-stellar-gold text-stellar-black"
            >
              Ir a Home
            </Button>
          </div>
        </div>
        </Layout.Inset>
      </Layout.Content>
    );
  }

  return (
    <Layout.Content>
      <Layout.Inset>
        <div className="min-h-screen bg-stellar-white py-6 md:py-12">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-24 items-start">
              <div className="col-span-full xl:col-span-17 text-center xl:text-left">
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="mb-4"
                >
                  ← Volver
                </Button>
                <Text as="h1" size="xl" className="text-3xl md:text-4xl font-headline text-stellar-black mb-2">
                  Reclamar SPOT
                </Text>
                <Text as="p" size="md" className="text-stellar-black font-subhead italic">
                  Elige un método para reclamar tu SPOT
                </Text>
              </div>
              <div className="col-span-full xl:col-span-24 xl:row-start-2 xl:flex xl:justify-center">
                <TldrCard
                  className="xl:mx-auto"
                  summary="Decide cómo reclamar tu comprobante: QR, link, código, geolocalización o NFC según el contexto del evento."
                  bullets={[
                    { label: "QR primero", detail: "Experiencia más rápida en eventos físicos." },
                    { label: "Link único", detail: "Ideal para claims remotos con copy pragmático." },
                    { label: "Geo & NFC", detail: "Visibilidad de métodos futuros con transparencia." },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Methods Grid */}
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* QR Code */}
            <button
              onClick={() => handleMethodSelect("qr")}
              className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                activeMethod === "qr"
                  ? "border-stellar-gold bg-stellar-gold/10"
                  : "border-stellar-lilac/30 bg-stellar-white hover:border-stellar-lilac hover:bg-stellar-lilac/5"
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="text-4xl">📷</div>
                <div className="flex-1">
                  <Text as="h3" size="md" className="font-body font-medium text-stellar-black mb-1">
                    Escanear QR
                  </Text>
                  <Text as="p" size="sm" className="text-stellar-black/70 font-body">
                    Escanea el código QR del evento
                  </Text>
                </div>
              </div>
            </button>

            {/* Link */}
            <button
              onClick={() => handleMethodSelect("link")}
              className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                activeMethod === "link"
                  ? "border-stellar-gold bg-stellar-gold/10"
                  : "border-stellar-lilac/30 bg-stellar-white hover:border-stellar-lilac hover:bg-stellar-lilac/5"
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="text-4xl">🔗</div>
                <div className="flex-1">
                  <Text as="h3" size="md" className="font-body font-medium text-stellar-black mb-1">
                    Usar Link
                  </Text>
                  <Text as="p" size="sm" className="text-stellar-black/70 font-body">
                    Ingresa el link único del evento
                  </Text>
                </div>
              </div>
            </button>

            {/* Code */}
            <button
              onClick={() => handleMethodSelect("code")}
              className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                activeMethod === "code"
                  ? "border-stellar-gold bg-stellar-gold/10"
                  : "border-stellar-lilac/30 bg-stellar-white hover:border-stellar-lilac hover:bg-stellar-lilac/5"
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="text-4xl">🔢</div>
                <div className="flex-1">
                  <Text as="h3" size="md" className="font-body font-medium text-stellar-black mb-1">
                    Código Compartido
                  </Text>
                  <Text as="p" size="sm" className="text-stellar-black/70 font-body">
                    Ingresa el código del evento
                  </Text>
                </div>
              </div>
            </button>

            {/* Geolocation */}
            <button
              onClick={() => handleMethodSelect("geolocation")}
              className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                activeMethod === "geolocation"
                  ? "border-stellar-gold bg-stellar-gold/10"
                  : "border-stellar-lilac/30 bg-stellar-white hover:border-stellar-lilac hover:bg-stellar-lilac/5"
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="text-4xl">📍</div>
                <div className="flex-1">
                  <Text as="h3" size="md" className="font-body font-medium text-stellar-black mb-1">
                    Geolocalización
                  </Text>
                  <Text as="p" size="sm" className="text-stellar-black/70 font-body">
                    Verifica tu ubicación cerca del evento
                  </Text>
                </div>
              </div>
            </button>

            {/* NFC */}
            <button
              onClick={() => handleMethodSelect("nfc")}
              className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                activeMethod === "nfc"
                  ? "border-stellar-gold bg-stellar-gold/10"
                  : "border-stellar-lilac/30 bg-stellar-white hover:border-stellar-lilac hover:bg-stellar-lilac/5"
              }`}
              disabled={!("NDEFReader" in window)}
            >
              <div className="flex items-center space-x-4">
                <div className="text-4xl">💳</div>
                <div className="flex-1">
                  <Text as="h3" size="md" className="font-body font-medium text-stellar-black mb-1">
                    NFC
                  </Text>
                  <Text as="p" size="sm" className="text-stellar-black/70 font-body">
                    Acerca tu dispositivo al tag NFC
                  </Text>
                  {!("NDEFReader" in window) && (
                    <Text as="p" size="xs" className="text-gray-400 mt-1">
                      No disponible en tu dispositivo
                    </Text>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Action Panel */}
          {activeMethod && (
            <div className="mt-8 p-6 bg-stellar-lilac/10 rounded-xl border border-stellar-lilac/30 max-w-3xl mx-auto">
              {activeMethod === "qr" && (
                <div className="space-y-4">
                  <Text as="p" size="md" className="text-stellar-black font-subhead">
                    Escanear código QR
                  </Text>
                  <Button
                    onClick={handleQRScan}
                    variant="primary"
                    size="lg"
                    disabled={isProcessing}
                    className="w-full bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 shadow-md hover:shadow-lg transition-all"
                  >
                    {isProcessing ? "Procesando..." : "Abrir Cámara"}
                  </Button>
                </div>
              )}

              {activeMethod === "link" && (
                <div className="space-y-4">
                  <Text as="p" size="md" className="text-stellar-black font-subhead">
                    Ingresa el link del evento
                  </Text>
                  <Input
                    id="link-input"
                    fieldSize="md"
                    type="url"
                    value={linkValue}
                    onChange={(e) => setLinkValue(e.target.value)}
                    placeholder="https://spot.example.com/event/..."
                    className="w-full"
                  />
                  <Button
                    onClick={handleLinkClaim}
                    variant="primary"
                    size="lg"
                    disabled={isProcessing || !linkValue.trim()}
                    className="w-full bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 shadow-md hover:shadow-lg transition-all"
                  >
                    {isProcessing ? "Procesando..." : "Reclamar SPOT"}
                  </Button>
                </div>
              )}

              {activeMethod === "code" && (
                <div className="space-y-4">
                  <Text as="p" size="md" className="text-stellar-black font-subhead">
                    Ingresa el código del evento
                  </Text>
                  <Input
                    id="code-input"
                    fieldSize="md"
                    type="text"
                    value={codeValue}
                    onChange={(e) => setCodeValue(e.target.value.toUpperCase())}
                    placeholder="Ej: HACKATHON2024"
                    className="w-full uppercase"
                  />
                  <Button
                    onClick={handleCodeClaim}
                    variant="primary"
                    size="lg"
                    disabled={isProcessing || !codeValue.trim()}
                    className="w-full bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 shadow-md hover:shadow-lg transition-all"
                  >
                    {isProcessing ? "Procesando..." : "Reclamar SPOT"}
                  </Button>
                </div>
              )}

              {activeMethod === "geolocation" && (
                <div className="space-y-4">
                  <Text as="p" size="md" className="text-stellar-black font-subhead">
                    Verificar ubicación
                  </Text>
                  <Button
                    onClick={handleGeolocation}
                    variant="primary"
                    size="lg"
                    disabled={isProcessing}
                    className="w-full bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 shadow-md hover:shadow-lg transition-all"
                  >
                    {isProcessing ? "Procesando..." : "Verificar Ubicación"}
                  </Button>
                </div>
              )}

              {activeMethod === "nfc" && (
                <div className="space-y-4">
                  <Text as="p" size="md" className="text-stellar-black font-subhead">
                    Acerca tu dispositivo al tag NFC
                  </Text>
                  <Text as="p" size="sm" className="text-stellar-black/70 font-body">
                    Asegúrate de que NFC esté activado en tu dispositivo
                  </Text>
                  {/* TODO: Implementar NFC reader */}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
        </Layout.Inset>
      </Layout.Content>
    );
  };

export default Mint;

