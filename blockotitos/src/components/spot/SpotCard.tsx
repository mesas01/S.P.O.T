import React from "react";
import { Text } from "@stellar/design-system";

export interface SpotData {
  id: number;
  name: string;
  date: string;
  image: string; // Puede ser emoji, URL de imagen, o ruta relativa a /images/events/
  color?: string;
  eventId?: string;
}

interface SpotCardProps {
  spot: SpotData;
  onClick?: () => void;
}

const SpotCard: React.FC<SpotCardProps> = ({ spot, onClick }) => {
  const formattedDate = new Date(spot.date).toLocaleDateString('es-ES', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const colorClass = spot.color || "from-stellar-lilac/20 to-stellar-lilac/40";

  return (
    <div
      onClick={onClick}
      className={`
        bg-stellar-white rounded-2xl shadow-lg overflow-hidden border-2
        border-stellar-lilac/20 hover:border-stellar-gold
        transition-all duration-300 hover:scale-105 hover:shadow-2xl
        cursor-pointer
      `}
    >
      {/* Badge Circle */}
      <div className={`bg-gradient-to-br ${colorClass} p-8 flex items-center justify-center`}>
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center border-4 border-white/50 shadow-inner overflow-hidden">
          {spot.image.startsWith('http') || spot.image.startsWith('/images/') ? (
            <img 
              src={spot.image.startsWith('/') ? spot.image : spot.image} 
              alt={spot.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Si falla la imagen, mostrar emoji por defecto
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.parentElement) {
                  const fallback = document.createElement('span');
                  fallback.className = 'text-5xl md:text-6xl';
                  fallback.textContent = '🎯';
                  target.parentElement.appendChild(fallback);
                }
              }}
            />
          ) : (
            <span className="text-5xl md:text-6xl">{spot.image || "🎯"}</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 md:p-6">
        <Text as="h3" size="md" className="text-lg md:text-xl font-subhead text-stellar-black mb-2 line-clamp-2">
          {spot.name}
        </Text>
        <div className="flex items-center text-stellar-black/70 mb-4">
          <span className="text-sm font-body">📅 {formattedDate}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stellar-lilac bg-stellar-lilac/10 px-3 py-1 rounded-full font-body">
            Verified
          </span>
          <span className="text-xs text-stellar-black/50 font-body">#{spot.id.toString().padStart(4, '0')}</span>
        </div>
      </div>
    </div>
  );
};

export default SpotCard;

