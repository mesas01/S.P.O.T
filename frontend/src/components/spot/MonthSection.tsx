import React from "react";
import { Text } from "@stellar/design-system";
import SpotCard, { SpotData } from "./SpotCard";

interface MonthSectionProps {
  month: string; // "Noviembre 2025"
  year: number;
  spots: SpotData[];
  onSpotClick?: (spot: SpotData) => void;
}

const MonthSection: React.FC<MonthSectionProps> = ({ month, year, spots, onSpotClick }) => {
  if (spots.length === 0) return null;

  return (
    <div className="mb-12">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Text as="h2" size="lg" className="text-2xl md:text-3xl font-headline text-stellar-black mb-1">
            {month}
          </Text>
          <Text as="p" size="sm" className="text-stellar-black font-body">
            {spots.length} {spots.length === 1 ? 'SPOT' : 'SPOTs'}
          </Text>
        </div>
        <div className="text-right">
          <Text as="p" size="sm" className="text-stellar-lilac font-subhead font-semibold">
            {year}
          </Text>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {spots.map((spot) => (
          <SpotCard
            key={spot.id}
            spot={spot}
            onClick={() => onSpotClick?.(spot)}
          />
        ))}
      </div>
    </div>
  );
};

export default MonthSection;

