import { buildSeatMatrix, toRowLabel } from '@/modules/seats/utils/seat-matrix';

describe('seat matrix generation', () => {
  it('generates the expected number of seats', () => {
    expect(buildSeatMatrix('zone-1', 2, 3)).toHaveLength(6);
    expect(buildSeatMatrix('zone-1', 4, 8)).toHaveLength(32);
  });

  it('labels normal rows and seat numbers correctly', () => {
    expect(buildSeatMatrix('zone-1', 2, 3)).toEqual([
      { rowLabel: 'A', seatNumber: 1, zoneId: 'zone-1' },
      { rowLabel: 'A', seatNumber: 2, zoneId: 'zone-1' },
      { rowLabel: 'A', seatNumber: 3, zoneId: 'zone-1' },
      { rowLabel: 'B', seatNumber: 1, zoneId: 'zone-1' },
      { rowLabel: 'B', seatNumber: 2, zoneId: 'zone-1' },
      { rowLabel: 'B', seatNumber: 3, zoneId: 'zone-1' },
    ]);
  });

  it('continues row labels after Z', () => {
    expect(toRowLabel(25)).toBe('Z');
    expect(toRowLabel(26)).toBe('AA');
    expect(toRowLabel(27)).toBe('AB');

    expect(buildSeatMatrix('zone-1', 27, 1).at(-1)).toEqual({
      rowLabel: 'AA',
      seatNumber: 1,
      zoneId: 'zone-1',
    });
  });
});
