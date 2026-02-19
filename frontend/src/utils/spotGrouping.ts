import { SpotData } from "../components/spot/SpotCard";

export interface GroupedSpots {
  [key: string]: {
    month: string;
    year: number;
    spots: SpotData[];
  };
}

/**
 * Agrupa SPOTs por mes y año
 * @param spots Array de SPOTs
 * @returns Objeto agrupado por mes/año
 */
export const groupSpotsByMonth = (spots: SpotData[]): GroupedSpots => {
  const grouped: GroupedSpots = {};

  spots.forEach((spot) => {
    const date = new Date(spot.date);
    const year = date.getFullYear();
    const month = date.toLocaleDateString('es-ES', { month: 'long' });
    const key = `${year}-${date.getMonth()}`;
    const monthLabel = month.charAt(0).toUpperCase() + month.slice(1); // Capitalizar primera letra

    if (!grouped[key]) {
      grouped[key] = {
        month: monthLabel,
        year,
        spots: [],
      };
    }

    grouped[key].spots.push(spot);
  });

  // Ordenar SPOTs dentro de cada grupo por fecha (más reciente primero)
  Object.keys(grouped).forEach((key) => {
    grouped[key].spots.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  });

  // Ordenar grupos por año y mes (más reciente primero)
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const [yearA, monthA] = a.split('-').map(Number);
    const [yearB, monthB] = b.split('-').map(Number);
    
    if (yearA !== yearB) {
      return yearB - yearA; // Años descendentes
    }
    return monthB - monthA; // Meses descendentes
  });

  const sorted: GroupedSpots = {};
  sortedKeys.forEach((key) => {
    sorted[key] = grouped[key];
  });

  return sorted;
};

/**
 * Calcula el total de SPOTs
 */
export const getTotalSpots = (spots: SpotData[]): number => {
  return spots.length;
};

