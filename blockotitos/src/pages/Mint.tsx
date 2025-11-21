import React, { useState } from "react";
import { Layout, Text, Button, Input } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";

const Mint: React.FC = () => {
  const { address } = useWallet();
  const isConnected = !!address;
  const navigate = useNavigate();

  const [activeMethod, setActiveMethod] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState("");
  const [codeValue, setCodeValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMethodSelect = (method: string) => {
    setActiveMethod(method);
  };

  const handleQRScan = async () => {
    // TODO: Implementar escáner QR
    // Por ahora, simulamos
    setIsProcessing(true);
    try {
      // Simular escaneo y claim
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert("¡SPOT reclamado exitosamente!");
      navigate("/");
    } catch (error) {
      console.error("Error al reclamar SPOT:", error);
      alert("Error al reclamar SPOT. Por favor, intenta nuevamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLinkClaim = async () => {
    if (!linkValue.trim()) {
      alert("Por favor, ingresa un link válido");
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Validar link y ejecutar claim
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert("¡SPOT reclamado exitosamente!");
      navigate("/");
    } catch (error) {
      console.error("Error al reclamar SPOT:", error);
      alert("Error al reclamar SPOT. Por favor, intenta nuevamente.");
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
      // TODO: Validar código y ejecutar claim
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert("¡SPOT reclamado exitosamente!");
      navigate("/");
    } catch (error) {
      console.error("Error al reclamar SPOT:", error);
      alert("Error al reclamar SPOT. Por favor, intenta nuevamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeolocation = async () => {
    setIsProcessing(true);
    try {
      // TODO: Solicitar permisos de geolocalización y validar
      if (!navigator.geolocation) {
        alert("Tu navegador no soporta geolocalización");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async () => {
          // TODO: Validar proximidad y ejecutar claim
          await new Promise(resolve => setTimeout(resolve, 2000));
          alert("¡SPOT reclamado exitosamente!");
          navigate("/");
        },
        (error) => {
          console.error("Error de geolocalización:", error);
          alert("Error al obtener tu ubicación. Por favor, intenta nuevamente.");
        }
      );
    } catch (error) {
      console.error("Error:", error);
      alert("Error al reclamar SPOT. Por favor, intenta nuevamente.");
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
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
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

          {/* Methods Grid */}
          <div className="space-y-4">
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
                  <Text as="h3" size="md" className="font-subhead text-stellar-black mb-1">
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
                  <Text as="h3" size="md" className="font-semibold text-black mb-1">
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
                  <Text as="h3" size="md" className="font-semibold text-black mb-1">
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
                  <Text as="h3" size="md" className="font-semibold text-black mb-1">
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
                  <Text as="h3" size="md" className="font-semibold text-black mb-1">
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
            <div className="mt-8 p-6 bg-stellar-lilac/10 rounded-xl border border-stellar-lilac/30">
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

