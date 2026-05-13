const ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export type GeneratedSeat = {
  zoneId: string;
  rowLabel: string;
  seatNumber: number;
};

export const toRowLabel = (rowIndex: number): string => {
  let value = rowIndex;
  let label = '';

  do {
    label = ROW_LABELS[value % ROW_LABELS.length] + label;
    value = Math.floor(value / ROW_LABELS.length) - 1;
  } while (value >= 0);

  return label;
};

export const buildSeatMatrix = (
  zoneId: string,
  rows: number,
  seatsPerRow: number,
): GeneratedSeat[] => {
  const seats: GeneratedSeat[] = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const rowLabel = toRowLabel(rowIndex);

    for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber += 1) {
      seats.push({
        rowLabel,
        seatNumber,
        zoneId,
      });
    }
  }

  return seats;
};
