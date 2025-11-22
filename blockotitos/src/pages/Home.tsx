import React, { useEffect, useMemo, useState } from "react";
import { Layout, Text, Button } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import MonthSection from "../components/spot/MonthSection";
import { SpotData } from "../components/spot/SpotCard";
import { groupSpotsByMonth, getTotalSpots } from "../utils/spotGrouping";
import TldrCard from "../components/layout/TldrCard";
import ConnectAccount from "../components/ConnectAccount";
import {
  getClaimedSpots,
  mapStoredSpotToSpotData,
} from "../utils/claimedSpots";

const mockSpots: SpotData[] = [
  {
    id: 1,
    name: "Stellar Palooza",
    date: "2025-11-15",
    image: "/images/events/stellarpalooza.jpg",
    color: "from-stellar-lilac/30 to-stellar-lilac/50",
    isPlaceholder: true,
  },
  {
    id: 2,
    name: "Hackathon Stellar 2024",
    date: "2025-11-20",
    image: "/images/events/hack+.jpg",
    color: "from-stellar-gold/30 to-stellar-lilac/50",
    isPlaceholder: true,
  },
  {
    id: 3,
    name: "Hackathon Stellar 2024 - Segundo día",
    date: "2025-10-10",
    image: "/images/events/hack+2.jpg",
    color: "from-stellar-teal/30 to-stellar-lilac/50",
  },
  {
    id: 4,
    name: "Summer Fridays",
    date: "2025-10-05",
    image: "/images/events/summer_fridays.jpg",
    color: "from-stellar-gold/30 to-stellar-teal/50",
  },
  {
    id: 5,
    name: "Autumn Fridays",
    date: "2025-09-28",
    image: "/images/events/autumfridays.jpg",
    color: "from-stellar-lilac/30 to-stellar-gold/50",
    isPlaceholder: true,
  },
];

const Home: React.FC = () => {
  const { address } = useWallet();
  const navigate = useNavigate();
  const isConnected = !!address;
  const [claimedSpots, setClaimedSpots] = useState<SpotData[]>([]);

  useEffect(() => {
    if (!address) {
      setClaimedSpots([]);
      return;
    }

    const loadClaimedSpots = () => {
      const stored = getClaimedSpots(address).map(mapStoredSpotToSpotData);
      const sorted = [...stored].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setClaimedSpots(sorted);
    };

    loadClaimedSpots();

    const handleUpdate = () => loadClaimedSpots();
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("claimedSpotsUpdated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("claimedSpotsUpdated", handleUpdate);
    };
  }, [address]);
  
  const spotsToDisplay = useMemo(() => {
    if (claimedSpots.length === 0) {
      return mockSpots;
    }
    return [...claimedSpots, ...mockSpots];
  }, [claimedSpots]);

  const groupedSpots = useMemo(
    () => groupSpotsByMonth(spotsToDisplay),
    [spotsToDisplay],
  );
  const totalSpots = getTotalSpots(spotsToDisplay);
  const hasDisplaySpots = spotsToDisplay.length > 0;

  return (
    <div className="bg-stellar-white min-h-screen">
      <Layout.Content>
        <Layout.Inset>
          <div className="min-h-screen bg-stellar-white py-6 md:py-12 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-20 w-96 h-96 bg-stellar-lilac/5 rounded-full blur-3xl" />
            <div className="absolute bottom-40 right-20 w-96 h-96 bg-stellar-gold/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-stellar-teal/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            {/* Hero Section - Rediseñado con logo y título sobre imagen de fondo */}
            <section className="mb-16 md:mb-20">
              <div className="relative rounded-3xl overflow-hidden border-2 border-stellar-lilac/20 bg-stellar-white shadow-xl">
                {/* Background image - Solo detrás del logo y título */}
                <div className="absolute inset-0 h-80 md:h-96">
                  <div className="absolute inset-0 bg-gradient-to-b from-stellar-black/40 via-stellar-black/30 to-stellar-white z-10" />
                  <img 
                    src="https://cdn.sanity.io/images/e2r40yh6/production-i18n/cdd8e585244fe22db899e5c2e463bde2793355e2-4200x3508.png?rect=0,356,4200,2797&w=506&h=337&auto=format&dpr=2"
                    alt="Background"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content sobre la imagen */}
                <div className="relative z-20 p-8 md:p-12 lg:p-16">
                  {/* Logo de Stellar grande con efecto */}
                  <div className="flex justify-center lg:justify-start mb-6">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-stellar-gold/30 rounded-full blur-3xl group-hover:blur-[60px] transition-all duration-500" />
                      <img 
                        src="https://cdn.sanity.io/images/e2r40yh6/production-i18n/9bed752a12d4ffe6c6118c93f8ca36ad60a573d3-1072x1072.png?rect=0,108,1072,857&w=1224&h=979&auto=format&dpr=2"
                        alt="Stellar"
                        className="relative w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500 filter brightness-110"
                      />
                    </div>
                  </div>

                  {/* Título con sombra para contraste */}
                  <Text
                    as="h1"
                    size="xl"
                    className="text-4xl md:text-5xl lg:text-6xl font-bold text-stellar-white mb-8 tracking-tight uppercase text-center lg:text-left drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                  >
                    SPOT · Stellar Proof of Togetherness
                  </Text>
                  
                  <Text
                    as="p"
                    size="lg"
                    className="text-lg md:text-2xl text-stellar-black/80 mb-4 italic font-light text-center lg:text-left"
                  >
                    <span className="text-stellar-gold font-medium">
                      Sabemos a quién hablamos: bancos, policymakers y builders.
                    </span>
                  </Text>
                  
                  <Text
                    as="p"
                    size="md"
                    className="text-base md:text-lg text-stellar-black/80 max-w-3xl mb-10 text-center lg:text-left mx-auto lg:mx-0"
                  >
                    SPOT es tu comprobante coleccionable en Stellar: diseña la pieza, define la ventana de reclamo y entrega recuerdos verificables que demuestran asistencia ante sponsors, instituciones y comunidades.
                  </Text>

                  {/* Wallet + CTA Buttons */}
                  <div className="flex flex-col gap-6 items-center lg:items-start">
                    <div className="w-full flex justify-center lg:justify-start">
                      <ConnectAccount />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center w-full">
                      <Button
                        onClick={() => navigate("/mint")}
                        variant="primary"
                        size="lg"
                        className="bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-8 py-3 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                      >
                        ⚡ Reclamar SPOT
                      </Button>
                      <Button
                        onClick={() => navigate("/create-event")}
                        variant="secondary"
                        size="lg"
                        className="bg-stellar-lilac text-stellar-black hover:bg-stellar-lilac/80 font-semibold rounded-full px-8 py-3 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                      >
                        ➕ Crear Evento
                      </Button>
                      {isConnected && (
                        <Button
                          onClick={() => navigate("/profile")}
                          variant="tertiary"
                          size="lg"
                          className="bg-stellar-white border-2 border-stellar-black/10 text-stellar-black hover:bg-stellar-black/5 font-medium rounded-full px-8 py-3 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                        >
                          👤 Mis SPOTs
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {!isConnected && (
              <>
                {/* Audience Guidance Section - Rediseñado */}
                <section className="mb-16 md:mb-20">
                  <div className="text-center mb-10">
                    <div className="text-sm uppercase tracking-wider text-stellar-black/60 font-semibold mb-3">
                      SPOT para cada equipo
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-stellar-black uppercase">
                      Diseñado para{" "}
                      <span className="text-stellar-gold">Profesionales</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Card 1 - con imagen */}
                    <div className="relative rounded-3xl overflow-hidden border-2 border-stellar-gold/20 bg-stellar-white shadow-xl group hover:-translate-y-2 transition-all duration-300">
                      {/* Hero image */}
                      <div className="relative h-56 bg-gradient-to-br from-stellar-gold/10 to-stellar-gold/5 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-stellar-gold/5 group-hover:bg-stellar-gold/10 transition-colors duration-300" />
                        <img 
                          src="https://cdn.sanity.io/images/e2r40yh6/production-i18n/48e528e291d7c6cfa7e5535a3f07703043d95e76-1064x966.png"
                          alt="Organizadores"
                          className="relative w-40 h-40 object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>

                      <div className="p-8">
                        <Text as="h3" size="md" className="text-2xl font-bold text-stellar-black mb-3 uppercase">
                          Organizadores & Builders
                        </Text>
                        <Text as="p" size="sm" className="text-stellar-black/80 mb-6">
                          Configura certificados coleccionables en minutos, conecta APIs si lo necesitas y maneja registros desde el móvil o el escenario.
                        </Text>
                        <ul className="space-y-3 text-sm text-stellar-black/80">
                          <li className="flex items-start gap-2">
                            <span className="text-stellar-gold font-bold">•</span>
                            <span>Herramientas self-service para crear, editar y pausar eventos.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-stellar-gold font-bold">•</span>
                            <span>Integraciones Soroban listas para automatizar claims.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-stellar-gold font-bold">•</span>
                            <span>Debugger disponible para equipos técnicos.</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Card 2 - con imagen */}
                    <div className="relative rounded-3xl overflow-hidden border-2 border-stellar-lilac/20 bg-stellar-white shadow-xl group hover:-translate-y-2 transition-all duration-300">
                      {/* Hero image */}
                      <div className="relative h-56 bg-gradient-to-br from-stellar-lilac/10 to-stellar-lilac/5 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-stellar-lilac/5 group-hover:bg-stellar-lilac/10 transition-colors duration-300" />
                        <img 
                          src="https://cdn.sanity.io/images/e2r40yh6/production-i18n/0d0e3d25f708801c44682ad9d680ae707c5e40cb-4200x3508.png?rect=841,0,2518,3147&w=1012&h=1265&auto=format&dpr=2"
                          alt="Sponsors"
                          className="relative w-40 h-40 object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>

                      <div className="p-8">
                        <Text as="h3" size="md" className="text-2xl font-bold text-stellar-black mb-3 uppercase">
                          Sponsors & Instituciones
                        </Text>
                        <Text as="p" size="sm" className="text-stellar-black/80 mb-6">
                          Obtén reportes claros sobre asistencia verificada y comparte pruebas on-chain con aliados o reguladores.
                        </Text>
                        <ul className="space-y-3 text-sm text-stellar-black/80">
                          <li className="flex items-start gap-2">
                            <span className="text-stellar-lilac font-bold">•</span>
                            <span>Métricas visibles para patrocinadores y equipo comercial.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-stellar-lilac font-bold">•</span>
                            <span>Evidencia inmutable hospedada en la red Stellar.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-stellar-lilac font-bold">•</span>
                            <span>Copys concisos para informes y aprobaciones rápidas.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Features Section - Rediseñado con imágenes grandes */}
                <section className="mb-16 md:mb-20">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-stellar-black uppercase mb-4">
                      Características <span className="text-stellar-teal">Principales</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Feature 1 */}
                    <div className="relative rounded-3xl overflow-hidden border-2 border-stellar-lilac/20 bg-stellar-white shadow-xl group hover:-translate-y-2 transition-all duration-300">
                      <div className="relative h-48 bg-gradient-to-br from-stellar-lilac/10 to-stellar-lilac/5 flex items-center justify-center">
                        <div className="absolute inset-0 bg-stellar-lilac/5 group-hover:bg-stellar-lilac/10 transition-colors duration-300" />
                        <img 
                          src="https://cdn.sanity.io/images/e2r40yh6/production-i18n/1e1d26a6ea7bd878932cb753bbd028e455fe0331-1100x1100.png?w=128&h=128&auto=format&dpr=2"
                          alt="Múltiples Métodos"
                          className="relative w-28 h-28 object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-6 text-center">
                        <Text as="h3" size="md" className="text-xl font-bold text-stellar-black mb-3 uppercase">
                          Múltiples Métodos
                        </Text>
                        <Text as="p" size="sm" className="text-stellar-black/80">
                          Reclama SPOTs con QR, Link, Código, Geolocalización o NFC
                        </Text>
                      </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="relative rounded-3xl overflow-hidden border-2 border-stellar-gold/30 bg-stellar-white shadow-xl group hover:-translate-y-2 transition-all duration-300">
                      <div className="relative h-48 bg-gradient-to-br from-stellar-gold/10 to-stellar-gold/5 flex items-center justify-center">
                        <div className="absolute inset-0 bg-stellar-gold/5 group-hover:bg-stellar-gold/10 transition-colors duration-300" />
                        <img 
                          src="https://cdn.sanity.io/images/e2r40yh6/production-i18n/9bed752a12d4ffe6c6118c93f8ca36ad60a573d3-1072x1072.png?rect=0,108,1072,857&w=1224&h=979&auto=format&dpr=2"
                          alt="Blockchain"
                          className="relative w-28 h-28 object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-6 text-center">
                        <Text as="h3" size="md" className="text-xl font-bold text-stellar-black mb-3 uppercase">
                          En la Blockchain
                        </Text>
                        <Text as="p" size="sm" className="text-stellar-black/80">
                          Tus SPOTs están guardados permanentemente en la red Stellar
                        </Text>
                      </div>
                    </div>

                    {/* Feature 3 */}
                    <div className="relative rounded-3xl overflow-hidden border-2 border-stellar-teal/20 bg-stellar-white shadow-xl group hover:-translate-y-2 transition-all duration-300">
                      <div className="relative h-48 bg-gradient-to-br from-stellar-teal/10 to-stellar-teal/5 flex items-center justify-center">
                        <div className="absolute inset-0 bg-stellar-teal/5 group-hover:bg-stellar-teal/10 transition-colors duration-300" />
                        <img 
                          src="https://cdn.sanity.io/images/e2r40yh6/production-i18n/47afd92486b4fa3731d8f58a38dabf41b71cb336-1100x1100.png?w=128&h=128&auto=format&dpr=2"
                          alt="Personalizables"
                          className="relative w-28 h-28 object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-6 text-center">
                        <Text as="h3" size="md" className="text-xl font-bold text-stellar-black mb-3 uppercase">
                          Personalizables
                        </Text>
                        <Text as="p" size="sm" className="text-stellar-black/80">
                          Crea eventos únicos con imágenes y metadata personalizada
                        </Text>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* User's SPOTs Section - Solo si está conectado */}
            {isConnected && hasDisplaySpots && (
              <>
                <div className="mb-10">
                  <h2 className="text-3xl md:text-4xl font-bold text-stellar-black mb-3 uppercase">
                    Tu <span className="text-stellar-gold">Colección</span>
                  </h2>
                  <Text as="p" size="md" className="text-stellar-black/70 italic text-lg">
                    {totalSpots} {totalSpots === 1 ? 'SPOT' : 'SPOTs'} en tu colección
                  </Text>
                </div>

                {/* Stats Section - Rediseñado */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-stellar-lilac/20 bg-stellar-white shadow-lg p-6 group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-stellar-lilac/10 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="text-4xl font-bold text-stellar-lilac mb-2">
                        {totalSpots}
                      </div>
                      <div className="text-base text-stellar-black/70 font-medium">Total SPOTs</div>
                    </div>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border-2 border-stellar-gold/30 bg-stellar-white shadow-lg p-6 group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-stellar-gold/10 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="text-4xl font-bold text-stellar-gold mb-2">
                        {Object.keys(groupedSpots).length}
                      </div>
                      <div className="text-base text-stellar-black/70 font-medium">Meses activos</div>
                    </div>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border-2 border-stellar-teal/20 bg-stellar-white shadow-lg p-6 group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-stellar-teal/10 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="text-4xl font-bold text-stellar-teal mb-2">
                        {new Date().getFullYear()}
                      </div>
                      <div className="text-base text-stellar-black/70 font-medium">Año actual</div>
                    </div>
                  </div>
                </div>

                {/* SPOTs grouped by month */}
                <div>
                  {Object.keys(groupedSpots).length === 0 ? (
                    <div className="text-center py-12">
                      <Text as="p" size="md" className="text-gray-500">
                        No hay SPOTs para mostrar
                      </Text>
                    </div>
                  ) : (
                    Object.values(groupedSpots).map((group: { year: number; month: string; spots: SpotData[] }) => (
                      <MonthSection
                        key={`${group.year}-${group.month}`}
                        month={group.month}
                        year={group.year}
                        spots={group.spots}
                        onSpotClick={(spot) => {
                          console.log("SPOT clicked:", spot);
                        }}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {/* Empty State - Not connected or no SPOTs */}
            {isConnected && totalSpots === 0 && (
              <div className="relative rounded-3xl overflow-hidden border-2 border-stellar-lilac/20 bg-stellar-white shadow-xl p-12 text-center">
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-stellar-gold/10 rounded-full blur-3xl" />
                </div>
                
                <div className="relative">
                  <div className="mb-6">
                    <img 
                      src="https://cdn.sanity.io/images/e2r40yh6/production-i18n/9bed752a12d4ffe6c6118c93f8ca36ad60a573d3-1072x1072.png?rect=0,108,1072,857&w=1224&h=979&auto=format&dpr=2"
                      alt="No SPOTs"
                      className="w-32 h-32 mx-auto object-contain drop-shadow-2xl opacity-50"
                    />
                  </div>
                  <Text as="h2" size="lg" className="text-3xl font-bold text-stellar-black mb-4 uppercase">
                    Aún no tienes SPOTs
                  </Text>
                  <Text as="p" size="md" className="text-stellar-black/70 max-w-md mx-auto mb-8">
                    Asiste a eventos y reclama tus SPOTs para comenzar tu colección.
                  </Text>
                  <Button
                    onClick={() => navigate("/mint")}
                    variant="primary"
                    size="lg"
                    className="bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-10 py-4 shadow-lg hover:shadow-xl transition-all"
                  >
                    Reclamar mi Primer SPOT
                  </Button>
                </div>
              </div>
            )}

            {/* Not Connected State - Rediseñado */}
            {!isConnected && (
              <div className="relative rounded-3xl overflow-hidden border-2 border-stellar-lilac/20 bg-stellar-white shadow-xl p-12 text-center mb-16">
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-80 h-80 bg-stellar-lilac/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-stellar-gold/10 rounded-full blur-3xl" />
                </div>
                
                <div className="relative">
                  <div className="mb-8">
                    <img 
                      src="https://cdn.sanity.io/images/e2r40yh6/production-i18n/44270b1791ec9a9513467e238259dd3a516ddbea-1024x768.png?rect=128,0,768,768&w=128&h=128&auto=format&dpr=2"
                      alt="Conecta Wallet"
                      className="w-40 h-40 mx-auto object-contain drop-shadow-2xl"
                    />
                  </div>
                  <Text as="h2" size="lg" className="text-3xl font-bold text-stellar-black mb-4 uppercase">
                    Conecta tu Wallet
                  </Text>
                  <Text as="p" size="md" className="text-stellar-black/70 max-w-lg mx-auto mb-8 text-lg">
                    Conecta tu wallet de Stellar para ver tu colección de SPOTs y reclamar nuevos.
                  </Text>
                  <Button
                    onClick={() => navigate("/profile")}
                    variant="primary"
                    size="lg"
                    className="bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-10 py-4 shadow-lg hover:shadow-xl transition-all"
                  >
                    Conectar Wallet
                  </Button>
                </div>
              </div>
            )}

            {/* TL;DR Summary - Rediseñado */}
            <section className="mb-16">
              <div className="max-w-5xl mx-auto">
                <TldrCard
                  summary="SPOT convierte tus eventos en coleccionables digitales verificados. Configura arte, cupos y métricas desde un mismo panel."
                  bullets={[
                    {
                      label: "Crea experiencias",
                      detail:
                        "Sube tu imagen, define cupos y programa fechas de reclamo para cada evento sin depender de desarrolladores.",
                    },
                    {
                      label: "Reclama sin fricción",
                      detail:
                        "QR, link, código, geofence o NFC listos para usar en campo, con botones visibles que empujan la conversión.",
                    },
                    {
                      label: "Demuestra valor",
                      detail:
                        "Cada comprobante vive en Stellar: útil para reportes, patrocinios y transparencia con tu comunidad.",
                    },
                  ]}
                />
              </div>
            </section>
          </div>
        </div>
        </Layout.Inset>
      </Layout.Content>
    </div>
  );
};

export default Home;