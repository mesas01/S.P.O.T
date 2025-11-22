import React from "react";
import { Layout, Text, Button } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import MonthSection from "../components/spot/MonthSection";
import { SpotData } from "../components/spot/SpotCard";
import { groupSpotsByMonth, getTotalSpots } from "../utils/spotGrouping";
import TldrCard from "../components/layout/TldrCard";
import ConnectAccount from "../components/ConnectAccount";

// Mock SPOT data for visual purposes - TODO: Obtener del contrato
// Imágenes reales desde /public/images/events/
const mockSpots: SpotData[] = [
  {
    id: 1,
    name: "Stellar Palooza",
    date: "2025-11-15",
    image: "/images/events/stellarpalooza.jpg",
    color: "from-stellar-lilac/30 to-stellar-lilac/50",
  },
  {
    id: 2,
    name: "Hackathon Stellar 2024",
    date: "2025-11-20",
    image: "/images/events/hack+.jpg",
    color: "from-stellar-gold/30 to-stellar-lilac/50",
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
  },
];

const Home: React.FC = () => {
  const { address } = useWallet();
  const navigate = useNavigate();
  const isConnected = !!address;
  
  // Agrupar SPOTs por mes/año
  const groupedSpots = groupSpotsByMonth(mockSpots);
  const totalSpots = getTotalSpots(mockSpots);

  // TODO: Obtener SPOTs reales del contrato cuando el wallet esté conectado
  // const { data: spots } = useSpotCollection(address);

  return (
    <Layout.Content>
      <Layout.Inset>
        <div className="min-h-screen bg-stellar-white py-6 md:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section - Brand Story */}
          <section className="mb-12 md:mb-16">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-24">
              <div className="col-span-full lg:col-span-17 brand-surface p-6 md:p-10 text-center lg:text-left">
                <div className="brand-eyebrow text-stellar-navy/70 mb-3">
                  SPOT · Proof of Attendance en Stellar
                </div>
                <div className="text-6xl md:text-7xl mb-6">🎯</div>
                <Text
                  as="h1"
                  size="xl"
                  className="text-4xl md:text-5xl lg:text-6xl font-headline text-stellar-black mb-4 tracking-tight uppercase"
                >
                  SPOT · Stellar Proof of Togetherness
                </Text>
                <Text
                  as="p"
                  size="lg"
                  className="text-lg md:text-2xl text-stellar-black mb-4 font-subhead italic"
                >
                  <span className="brand-highlight-text">
                    Sabemos a quién hablamos: bancos, policymakers y builders.
                  </span>
                </Text>
                <Text
                  as="p"
                  size="md"
                  className="text-base md:text-lg text-stellar-black/90 max-w-3xl mx-auto lg:mx-0 mb-8 font-body"
                >
                  SPOT es tu comprobante coleccionable en Stellar: diseña la pieza, define la ventana de reclamo y entrega recuerdos verificables que demuestran asistencia ante sponsors, instituciones y comunidades.
                </Text>

                {/* Wallet + CTA Buttons */}
                <div className="flex flex-col gap-4 items-center lg:items-start">
                  <div className="w-full flex justify-center lg:justify-start">
                    <ConnectAccount />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center w-full">
                    <Button
                      onClick={() => navigate("/mint")}
                      variant="primary"
                      size="lg"
                      className="bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-8 py-3 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                    >
                      ⚡ Reclamar SPOT
                    </Button>
                    <Button
                      onClick={() => navigate("/create-event")}
                      variant="secondary"
                      size="lg"
                      className="bg-stellar-lilac text-stellar-black hover:bg-stellar-lilac/80 font-semibold rounded-full px-8 py-3 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                    >
                      ➕ Crear Evento
                    </Button>
                    {isConnected && (
                      <Button
                        onClick={() => navigate("/profile")}
                        variant="tertiary"
                        size="lg"
                        className="bg-stellar-white border-2 border-stellar-black/10 text-stellar-black hover:bg-stellar-black/5 font-medium rounded-full px-8 py-3 shadow-sm hover:shadow-md transition-all w-full sm:w-auto"
                      >
                        👤 Mis SPOTs
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-full lg:col-span-7">
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
            </div>
          </section>

          {/* Audience Guidance Section */}
          <section className="brand-surface p-6 md:p-8 mb-12 md:mb-16">
            <div className="brand-eyebrow text-stellar-navy/70 mb-6">
              SPOT para cada equipo
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-stellar-black/10 bg-stellar-gold/10 p-6 shadow-brand-soft">
                <Text as="h3" size="md" className="font-headline text-2xl text-stellar-black mb-2 uppercase">
                  Organizadores & builders
                </Text>
                <Text as="p" size="sm" className="text-stellar-black/80 font-body mb-4">
                  Configura certificados coleccionables en minutos, conecta APIs si lo necesitas y maneja registros desde el móvil o el escenario.
                </Text>
                <ul className="space-y-2 text-sm font-body text-stellar-black/80">
                  <li>• Herramientas self-service para crear, editar y pausar eventos.</li>
                  <li>• Integraciones Soroban listas para automatizar claims.</li>
                  <li>• Debugger disponible para equipos técnicos.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-stellar-black/10 bg-stellar-lilac/10 p-6 shadow-brand-soft">
                <Text as="h3" size="md" className="font-headline text-2xl text-stellar-black mb-2 uppercase">
                  Sponsors & instituciones
                </Text>
                <Text as="p" size="sm" className="text-stellar-black/80 font-body mb-4">
                  Obtén reportes claros sobre asistencia verificada y comparte pruebas on-chain con aliados o reguladores.
                </Text>
                <ul className="space-y-2 text-sm font-body text-stellar-black/80">
                  <li>• Métricas visibles para patrocinadores y equipo comercial.</li>
                  <li>• Evidencia inmutable hospedada en la red Stellar.</li>
                  <li>• Copys concisos para informes y aprobaciones rápidas.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Features Section - Stellar Brand Colors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 md:mb-16">
            <div className="bg-stellar-white rounded-xl p-6 shadow-md border-2 border-stellar-lilac/20 text-center">
              <div className="text-4xl mb-4">📱</div>
              <Text as="h3" size="md" className="font-headline text-stellar-black mb-2 uppercase">
                Múltiples Métodos
              </Text>
              <Text as="p" size="sm" className="text-stellar-black font-body">
                Reclama SPOTs con QR, Link, Código, Geolocalización o NFC
              </Text>
            </div>
            <div className="bg-stellar-white rounded-xl p-6 shadow-md border-2 border-stellar-gold/30 text-center">
              <div className="text-4xl mb-4">🔒</div>
              <Text as="h3" size="md" className="font-headline text-stellar-black mb-2 uppercase">
                En la Blockchain
              </Text>
              <Text as="p" size="sm" className="text-stellar-black font-body">
                Tus SPOTs están guardados permanentemente en la red Stellar
              </Text>
            </div>
            <div className="bg-stellar-white rounded-xl p-6 shadow-md border-2 border-stellar-teal/20 text-center">
              <div className="text-4xl mb-4">🎨</div>
              <Text as="h3" size="md" className="font-headline text-stellar-black mb-2 uppercase">
                Personalizables
              </Text>
              <Text as="p" size="sm" className="text-stellar-black font-body">
                Crea eventos únicos con imágenes y metadata personalizada
              </Text>
            </div>
          </div>

          {/* User's SPOTs Section - Only if connected */}
          {isConnected && totalSpots > 0 && (
            <>
              <div className="mb-8">
                <Text as="h2" size="lg" className="text-2xl md:text-3xl font-headline text-stellar-black mb-2">
                  Tu Colección
                </Text>
                <Text as="p" size="md" className="text-stellar-black font-subhead italic">
                  {totalSpots} {totalSpots === 1 ? 'SPOT' : 'SPOTs'} en tu colección
                </Text>
              </div>

              {/* Stats Section - Stellar Brand Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                <div className="bg-stellar-white rounded-xl p-4 md:p-6 shadow-md border-2 border-stellar-lilac/20">
                  <div className="text-2xl md:text-3xl font-headline text-stellar-lilac mb-1 md:mb-2">
                    {totalSpots}
                  </div>
                  <div className="text-sm md:text-base text-stellar-black font-body">Total SPOTs</div>
                </div>
                <div className="bg-stellar-white rounded-xl p-4 md:p-6 shadow-md border-2 border-stellar-gold/30">
                  <div className="text-2xl md:text-3xl font-headline text-stellar-gold mb-1 md:mb-2">
                    {Object.keys(groupedSpots).length}
                  </div>
                  <div className="text-sm md:text-base text-stellar-black font-body">Meses activos</div>
                </div>
                <div className="bg-stellar-white rounded-xl p-4 md:p-6 shadow-md border-2 border-stellar-teal/20">
                  <div className="text-2xl md:text-3xl font-headline text-stellar-teal mb-1 md:mb-2">
                    {new Date().getFullYear()}
                  </div>
                  <div className="text-sm md:text-base text-stellar-black font-body">Año actual</div>
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
                        // TODO: Navegar a detalle del SPOT
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
            <div className="bg-stellar-white rounded-2xl shadow-lg p-8 md:p-12 text-center border-2 border-stellar-lilac/20">
              <div className="text-6xl mb-6">🎯</div>
              <Text as="h2" size="lg" className="text-2xl font-headline text-stellar-black mb-4">
                Aún no tienes SPOTs
              </Text>
              <Text as="p" size="md" className="text-stellar-black max-w-md mx-auto mb-6 font-body">
                Asiste a eventos y reclama tus SPOTs para comenzar tu colección.
              </Text>
              <Button
                onClick={() => navigate("/mint")}
                variant="primary"
                size="lg"
                className="bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-8 py-3 shadow-md hover:shadow-lg transition-all"
              >
                Reclamar mi Primer SPOT
              </Button>
            </div>
          )}

          {/* Not Connected State */}
          {!isConnected && (
            <div className="bg-stellar-white rounded-2xl shadow-lg p-8 md:p-12 text-center border-2 border-stellar-lilac/20">
              <div className="text-6xl mb-6">🔐</div>
              <Text as="h2" size="lg" className="text-2xl font-headline text-stellar-black mb-4">
                Conecta tu Wallet
              </Text>
              <Text as="p" size="md" className="text-stellar-black max-w-md mx-auto mb-6 font-body">
                Conecta tu wallet de Stellar para ver tu colección de SPOTs y reclamar nuevos.
              </Text>
              <Button
                onClick={() => navigate("/profile")}
                variant="primary"
                size="lg"
                className="bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full px-8 py-3 shadow-md hover:shadow-lg transition-all"
              >
                Conectar Wallet
              </Button>
            </div>
          )}
        </div>
        </div>
      </Layout.Inset>
    </Layout.Content>
  );
};

export default Home;
