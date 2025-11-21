import React, { useState, useEffect, useMemo } from "react";
import { Layout, Text, Button } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import { generateLinkQRCode } from "../utils/qrCode";
import { getLocalEventsByCreator } from "../utils/localEvents";

interface EventData {
  id: string;
  name: string;
  date: string;
  location: string;
  maxSpots: number;
  claimedSpots: number;
  claimStart: string;
  claimEnd: string;
  imageUrl: string;
  distributionMethods: {
    qr: boolean;
    link: boolean;
    code: boolean;
    geolocation: boolean;
    nfc: boolean;
  };
  links: {
    uniqueLink?: string;
    qrCode?: string;
  };
  codes: {
    sharedCode?: string;
  };
}


const MyEvents: React.FC = () => {
  const { address } = useWallet();
  const navigate = useNavigate();
  const isConnected = !!address;
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [loadingQR, setLoadingQR] = useState<Record<string, boolean>>({});

  // Obtener eventos locales (temporal hasta que el contrato esté configurado)
  const [localEvents, setLocalEvents] = useState<EventData[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Función auxiliar para generar QR
  const generateQRForEvent = async (eventId: string, uniqueLink: string) => {
    if (qrCodes[eventId] || loadingQR[eventId]) return;
    
    setLoadingQR(prev => ({ ...prev, [eventId]: true }));
    try {
      const qrCode = await generateLinkQRCode(uniqueLink);
      setQrCodes(prev => ({ ...prev, [eventId]: qrCode }));
    } catch (error) {
      console.error(`Error generando QR para evento ${eventId}:`, error);
    } finally {
      setLoadingQR(prev => ({ ...prev, [eventId]: false }));
    }
  };

  // Generar QR cuando se expande un evento específico
  const toggleEventDetails = async (eventId: string) => {
    const isExpanding = expandedEvent !== eventId;
    setExpandedEvent(expandedEvent === eventId ? null : eventId);

    // Si estamos expandiendo y no tenemos el QR, generarlo
    if (isExpanding) {
      const uniqueLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/mint?event=${eventId}`;
      await generateQRForEvent(eventId, uniqueLink);
    }
  };

  const copyToClipboard = (text: string, type: 'link' | 'code', id: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2000);
    } else {
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Función para cargar eventos locales
  const loadLocalEvents = () => {
    if (address) {
      setIsLoadingEvents(true);
      try {
        const events = getLocalEventsByCreator(address);
        // Convertir eventos locales al formato EventData
        const formattedEvents: EventData[] = events.map(event => ({
          id: event.id,
          name: event.name,
          date: event.date,
          location: event.location,
          maxSpots: event.maxSpots,
          claimedSpots: event.claimedSpots,
          claimStart: event.claimStart,
          claimEnd: event.claimEnd,
          imageUrl: event.imageUrl,
          distributionMethods: event.distributionMethods,
          links: {
            uniqueLink: `${typeof window !== 'undefined' ? window.location.origin : ''}/mint?event=${event.id}`,
          },
          codes: {
            sharedCode: `SPOT-${event.id.slice(-8).toUpperCase()}`,
          },
        }));
        setLocalEvents(formattedEvents);
      } catch (error) {
        console.error("Error cargando eventos locales:", error);
      } finally {
        setIsLoadingEvents(false);
      }
    } else {
      setLocalEvents([]);
    }
  };

  // Cargar eventos locales cuando cambia el address
  useEffect(() => {
    loadLocalEvents();
  }, [address]);

  // Escuchar cambios en localStorage para actualizar eventos en tiempo real
  useEffect(() => {
    const handleStorageChange = () => {
      loadLocalEvents();
    };

    window.addEventListener('storage', handleStorageChange);
    // También escuchar eventos personalizados para cambios en la misma pestaña
    window.addEventListener('localStorageUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdated', handleStorageChange);
    };
  }, [address]);

  if (!isConnected) {
    return (
      <Layout.Content>
        <Layout.Inset>
          <div className="min-h-screen bg-stellar-white py-12">
            <div className="max-w-2xl mx-auto text-center">
              <div className="text-6xl mb-6">🔐</div>
              <Text as="h2" size="lg" className="text-2xl font-headline text-stellar-black mb-4">
                Conecta tu Wallet
              </Text>
              <Text as="p" size="md" className="text-stellar-black mb-6 font-body">
                Necesitas conectar tu wallet para ver tus eventos.
              </Text>
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate("/")}
                className="bg-stellar-gold text-stellar-black rounded-full px-8 py-3 font-semibold"
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
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <Text as="h1" size="xl" className="text-3xl md:text-4xl font-headline text-stellar-black mb-2">
                    Mis Eventos
                  </Text>
                  <Text as="p" size="md" className="text-stellar-black/70 font-body">
                    {isLoadingEvents ? 'Cargando...' : localEvents.length === 0 ? '0 eventos creados' : `${localEvents.length} ${localEvents.length === 1 ? 'evento creado' : 'eventos creados'}`}
                  </Text>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate("/create-event")}
                  className="bg-stellar-gold text-stellar-black hover:bg-yellow-400 rounded-full px-6 py-2.5 font-semibold shadow-md"
                >
                  ➕ Crear Evento
                </Button>
              </div>
            </div>

            {/* Events List */}
            {isLoadingEvents ? (
              <div className="bg-stellar-white rounded-3xl shadow-lg p-12 text-center border border-stellar-lilac/20">
                <div className="text-6xl mb-6">⏳</div>
                <Text as="h2" size="lg" className="text-2xl font-headline text-stellar-black mb-4">
                  Cargando eventos...
                </Text>
                <Text as="p" size="md" className="text-stellar-black/70 mb-8 font-body max-w-md mx-auto">
                  Obteniendo tus eventos...
                </Text>
              </div>
            ) : localEvents.length === 0 ? (
              <div className="bg-stellar-white rounded-3xl shadow-lg p-12 text-center border border-stellar-lilac/20">
                <div className="text-6xl mb-6">📅</div>
                <Text as="h2" size="lg" className="text-2xl font-headline text-stellar-black mb-4">
                  Aún no has creado eventos
                </Text>
                <Text as="p" size="md" className="text-stellar-black/70 mb-8 font-body max-w-md mx-auto">
                  Crea tu primer evento para comenzar a distribuir SPOTs a los asistentes.
                </Text>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate("/create-event")}
                  className="bg-stellar-gold text-stellar-black hover:bg-yellow-400 rounded-full px-8 py-3 font-semibold shadow-md"
                >
                  Crear mi Primer Evento
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {localEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-stellar-white rounded-2xl shadow-sm border border-stellar-black/10 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                  >
                    {/* Event Card Header - Always Visible */}
                    <div 
                      className="p-5 md:p-6 cursor-pointer"
                      onClick={() => toggleEventDetails(event.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Event Image */}
                        {event.imageUrl && (
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 border-stellar-lilac/20 flex-shrink-0 bg-stellar-warm-grey/20">
                            {event.imageUrl.startsWith('http') || event.imageUrl.startsWith('/images/') || event.imageUrl.startsWith('data:') ? (
                              <img 
                                src={event.imageUrl} 
                                alt={event.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl">
                                🎯
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <Text as="h2" size="lg" className="text-xl md:text-2xl font-headline text-stellar-black">
                              {event.name}
                            </Text>
                            <button className="flex-shrink-0 text-stellar-black/40 hover:text-stellar-black transition-colors">
                              {expandedEvent === event.id ? '▼' : '▶'}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-stellar-black/60 font-body mb-3">
                            <span>📅 {new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span>📍 {event.location}</span>
                          </div>
                          
                          {/* Stats Bar */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-stellar-lilac/10 rounded-full px-4 py-1.5">
                              <span className="text-sm font-semibold text-stellar-black">🎫</span>
                              <span className="text-sm font-semibold text-stellar-black">{event.claimedSpots}/{event.maxSpots}</span>
                              <span className="text-xs text-stellar-black/60">reclamados</span>
                            </div>
                            <div className="text-xs text-stellar-black/50 font-body">
                              {event.maxSpots > 0 ? Math.round((event.claimedSpots / event.maxSpots) * 100) : 0}% completado
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details */}
                    {expandedEvent === event.id && (
                      <div className="border-t border-stellar-black/10 p-5 md:p-6 bg-stellar-warm-grey/20 space-y-6">
                        {/* Claim Period */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/20">
                            <Text as="p" size="xs" className="text-stellar-black/50 font-body mb-1 uppercase tracking-wide">
                              Inicio
                            </Text>
                            <Text as="p" size="md" className="text-stellar-black font-body">
                              {formatDate(event.claimStart)}
                            </Text>
                          </div>
                          <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/20">
                            <Text as="p" size="xs" className="text-stellar-black/50 font-body mb-1 uppercase tracking-wide">
                              Fin
                            </Text>
                            <Text as="p" size="md" className="text-stellar-black font-body">
                              {formatDate(event.claimEnd)}
                            </Text>
                          </div>
                        </div>

                        {/* Distribution Methods */}
                        <div>
                          <Text as="h3" size="sm" className="font-headline text-stellar-black mb-3 uppercase text-sm tracking-wide">
                            Métodos Activos
                          </Text>
                          <div className="flex flex-wrap gap-2">
                            {event.distributionMethods.qr && (
                              <span className="px-4 py-2 bg-stellar-gold/20 text-stellar-black rounded-full text-sm font-body border border-stellar-gold/30">
                                📷 QR
                              </span>
                            )}
                            {event.distributionMethods.link && (
                              <span className="px-4 py-2 bg-stellar-lilac/20 text-stellar-black rounded-full text-sm font-body border border-stellar-lilac/30">
                                🔗 Link
                              </span>
                            )}
                            {event.distributionMethods.code && (
                              <span className="px-4 py-2 bg-stellar-teal/20 text-stellar-black rounded-full text-sm font-body border border-stellar-teal/30">
                                🔢 Código
                              </span>
                            )}
                            {event.distributionMethods.geolocation && (
                              <span className="px-4 py-2 bg-stellar-warm-grey/50 text-stellar-black rounded-full text-sm font-body border border-stellar-black/10">
                                📍 Geo
                              </span>
                            )}
                            {event.distributionMethods.nfc && (
                              <span className="px-4 py-2 bg-stellar-navy/20 text-stellar-black rounded-full text-sm font-body border border-stellar-navy/30">
                                💳 NFC
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Links and Codes */}
                        <div className="space-y-4">
                          {/* Unique Link */}
                          {event.links.uniqueLink && (
                            <div className="bg-stellar-white rounded-xl p-5 border border-stellar-lilac/20">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">🔗</span>
                                <Text as="h3" size="md" className="font-headline text-stellar-black">
                                  Link Único
                                </Text>
                              </div>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <div className="flex-1 bg-stellar-warm-grey/30 rounded-lg p-3 border border-stellar-lilac/20 min-w-0">
                                  <Text as="p" size="sm" className="font-mono text-stellar-black break-all font-body text-xs">
                                    {event.links.uniqueLink}
                                  </Text>
                                </div>
                                <Button
                                  variant="primary"
                                  size="md"
                                  onClick={() => copyToClipboard(event.links.uniqueLink!, 'link', event.id)}
                                  className={`flex-shrink-0 rounded-full px-6 py-2.5 font-semibold ${
                                    copiedLink === event.id 
                                      ? 'bg-stellar-teal text-stellar-white' 
                                      : 'bg-stellar-lilac text-stellar-black hover:bg-stellar-lilac/80'
                                  }`}
                                >
                                  {copiedLink === event.id ? "✓ Copiado" : "📋 Copiar"}
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Shared Code */}
                          {event.codes.sharedCode && (
                            <div className="bg-stellar-white rounded-xl p-5 border border-stellar-gold/30">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">🔢</span>
                                <Text as="h3" size="md" className="font-headline text-stellar-black">
                                  Código Compartido
                                </Text>
                              </div>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <div className="flex-1 bg-stellar-gold/10 rounded-lg p-4 border border-stellar-gold/30 text-center">
                                  <Text as="p" size="xl" className="font-headline text-stellar-black font-mono tracking-wider">
                                    {event.codes.sharedCode}
                                  </Text>
                                </div>
                                <Button
                                  variant="primary"
                                  size="md"
                                  onClick={() => copyToClipboard(event.codes.sharedCode!, 'code', event.id)}
                                  className={`flex-shrink-0 rounded-full px-6 py-2.5 font-semibold ${
                                    copiedCode === event.id 
                                      ? 'bg-stellar-teal text-stellar-white' 
                                      : 'bg-stellar-gold text-stellar-black hover:bg-yellow-400'
                                  }`}
                                >
                                  {copiedCode === event.id ? "✓ Copiado" : "📋 Copiar"}
                                </Button>
                              </div>
                              <Text as="p" size="xs" className="text-stellar-black/50 mt-3 text-center font-body italic">
                                Comparte este código con los asistentes
                              </Text>
                            </div>
                          )}

                          {/* QR Code */}
                          {event.distributionMethods.qr && (
                            <div className="bg-stellar-white rounded-xl p-5 border border-stellar-teal/20 text-center">
                              <div className="flex items-center justify-center gap-2 mb-4">
                                <span className="text-xl">📷</span>
                                <Text as="h3" size="md" className="font-headline text-stellar-black">
                                  Código QR
                                </Text>
                              </div>
                              {loadingQR[event.id] ? (
                                <div className="flex justify-center items-center py-8">
                                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stellar-teal"></div>
                                  <Text as="p" size="sm" className="text-stellar-black/50 ml-4 font-body">
                                    Generando QR...
                                  </Text>
                                </div>
                              ) : qrCodes[event.id] ? (
                                <>
                                  <div className="flex justify-center mb-3">
                                    <div className="bg-white p-4 rounded-xl border-2 border-stellar-teal/30 shadow-md">
                                      <img 
                                        src={qrCodes[event.id]} 
                                        alt="QR Code del evento"
                                        className="w-40 h-40"
                                        onError={(e) => {
                                          console.error('Error cargando QR:', e);
                                          e.currentTarget.src = '';
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <Text as="p" size="xs" className="text-stellar-black/50 font-body italic mb-2">
                                    Escanea para reclamar tu SPOT
                                  </Text>
                                  {event.links.uniqueLink && (
                                    <Text as="p" size="xs" className="text-stellar-black/40 font-body font-mono text-xs break-all px-4">
                                      {event.links.uniqueLink}
                                    </Text>
                                  )}
                                </>
                              ) : (
                                <div className="py-8">
                                  <Text as="p" size="sm" className="text-stellar-black/50 font-body">
                                    No se pudo generar el código QR. Por favor, intenta nuevamente.
                                  </Text>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout.Inset>
    </Layout.Content>
  );
};

export default MyEvents;
