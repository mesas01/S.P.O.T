import React from "react";
import { Layout, Text, Button } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import ConnectAccount from "../components/ConnectAccount";

const Profile: React.FC = () => {
  const { address, balances } = useWallet();
  const navigate = useNavigate();
  const isConnected = !!address;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Mostrar notificación de copiado
  };

  // Obtener balance de XLM
  const xlmBalance = balances?.xlm?.balance || '0';

  return (
    <Layout.Content>
      <Layout.Inset>
        <div className="min-h-screen bg-stellar-white py-6 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => navigate("/")}
              className="mb-4"
            >
              ← Volver
            </Button>
            <Text as="h1" size="xl" className="text-3xl md:text-4xl font-headline text-stellar-black mb-2">
              Mi Perfil
            </Text>
            <Text as="p" size="md" className="text-stellar-black font-subhead italic">
              Gestiona tu wallet y configuración
            </Text>
          </div>

          {!isConnected ? (
            <div className="bg-stellar-white rounded-2xl shadow-lg p-8 md:p-12 text-center border-2 border-stellar-lilac/20">
              <div className="text-6xl mb-6">🔐</div>
              <Text as="h2" size="lg" className="text-2xl font-headline text-stellar-black mb-4">
                Conecta tu Wallet
              </Text>
              <Text as="p" size="md" className="text-stellar-black max-w-md mx-auto mb-6 font-body">
                Conecta tu wallet de Stellar para ver tu información y balance.
              </Text>
              <ConnectAccount />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Wallet Info Card */}
              <div className="bg-stellar-white rounded-2xl shadow-lg p-6 md:p-8 border-2 border-stellar-lilac/20">
                <Text as="h2" size="lg" className="text-xl font-headline text-stellar-black mb-6">
                  Información de Wallet
                </Text>
                
                {/* Address */}
                <div className="mb-6">
                  <label className="block text-sm text-stellar-black/70 mb-2 font-body">
                    Dirección
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-stellar-warm-grey/30 rounded-lg p-3 border border-stellar-lilac/20">
                      <Text as="p" size="sm" className="font-mono text-stellar-black break-all font-body">
                        {address}
                      </Text>
                    </div>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => address && copyToClipboard(address)}
                      className="flex-shrink-0"
                    >
                      📋 Copiar
                    </Button>
                  </div>
                </div>

                {/* Balance */}
                <div>
                  <label className="block text-sm text-stellar-black/70 mb-2 font-body">
                    Balance
                  </label>
                  <div className="bg-gradient-to-br from-stellar-gold/20 to-stellar-lilac/20 rounded-lg p-4 border-2 border-stellar-gold/30">
                    <div className="flex items-center justify-between">
                      <Text as="p" size="md" className="text-stellar-black font-subhead">
                        XLM
                      </Text>
                      <Text as="p" size="lg" className="text-stellar-black font-headline text-2xl">
                        {parseFloat(xlmBalance).toFixed(2)} XLM
                      </Text>
                    </div>
                  </div>
                </div>
              </div>

              {/* Network Info */}
              <div className="bg-stellar-white rounded-2xl shadow-lg p-6 md:p-8 border-2 border-stellar-teal/20">
                <Text as="h2" size="lg" className="text-xl font-headline text-stellar-black mb-4">
                  Red
                </Text>
                <Text as="p" size="md" className="text-stellar-black font-body">
                  Stellar Testnet
                </Text>
              </div>

              {/* Actions */}
              <div className="bg-stellar-white rounded-2xl shadow-lg p-6 md:p-8 border-2 border-stellar-lilac/20">
                <Text as="h2" size="lg" className="text-xl font-headline text-stellar-black mb-4">
                  Acciones
                </Text>
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate("/")}
                    className="w-full bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 shadow-md hover:shadow-lg transition-all"
                  >
                    Ver Mis SPOTs
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => navigate("/create-event")}
                    className="w-full bg-stellar-lilac text-stellar-black hover:bg-stellar-lilac/80 font-semibold rounded-full py-3 shadow-md hover:shadow-lg transition-all"
                  >
                    Crear Evento
                  </Button>
                  <Button
                    variant="tertiary"
                    size="lg"
                    onClick={() => navigate("/mint")}
                    className="w-full bg-stellar-white border-2 border-stellar-teal/30 text-stellar-teal hover:bg-stellar-teal/10 font-semibold rounded-full py-3 shadow-sm hover:shadow-md transition-all"
                  >
                    Reclamar SPOT
                  </Button>
                </div>
              </div>

              {/* Disconnect */}
              <div className="pt-4">
                <Button
                  variant="tertiary"
                  size="md"
                  onClick={() => {
                    // TODO: Implementar desconexión
                    window.location.reload();
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Desconectar Wallet
                </Button>
              </div>
            </div>
          )}
        </div>
        </div>
      </Layout.Inset>
    </Layout.Content>
  );
};

export default Profile;

