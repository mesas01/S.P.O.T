import React from "react";
import { Text } from "@stellar/design-system";

export interface SpotData {
  id: number;
  name: string;
  date: string;
  image: string;
  color: string;
  isPlaceholder?: boolean;
}

interface SpotCardProps {
  spot: SpotData;
  onClick?: (spot: SpotData) => void;
}

const SpotCard: React.FC<SpotCardProps> = ({ spot, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(spot);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div
      onClick={handleClick}
      className="group relative rounded-2xl overflow-hidden border-2 border-stellar-lilac/20 bg-stellar-white shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-2"
    >
      {/* Decorative glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-stellar-gold/0 via-transparent to-stellar-lilac/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Image Section - Más pequeña */}
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-stellar-lilac/10 to-stellar-gold/10">
        {/* Background glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${spot.color} opacity-20 group-hover:opacity-30 transition-opacity duration-300`} />
        
        <img
          src={spot.image}
          alt={spot.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/400x300?text=SPOT";
          }}
        />

        {/* Placeholder badge */}
        {spot.isPlaceholder && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-stellar-gold/90 backdrop-blur-sm rounded-full">
            <Text as="span" size="xs" className="text-xs font-bold text-stellar-black uppercase">
              Preview
            </Text>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-stellar-black/0 group-hover:bg-stellar-black/10 transition-colors duration-300" />
      </div>

      {/* Content Section - Compacta */}
      <div className="p-4 relative z-10">
        <Text
          as="h3"
          size="sm"
          className="text-base font-bold text-stellar-black mb-2 line-clamp-2 group-hover:text-stellar-gold transition-colors duration-300 uppercase"
        >
          {spot.name}
        </Text>

        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-stellar-teal" />
          <Text
            as="p"
            size="xs"
            className="text-xs text-stellar-black/60 font-medium"
          >
            {formatDate(spot.date)}
          </Text>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-1 bg-gradient-to-r from-stellar-gold via-stellar-lilac to-stellar-teal transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </div>
  );
};

export default SpotCard;