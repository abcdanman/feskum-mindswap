/**
 * Row shape of the 19 numbered "Fac. booth" slots on the real printed
 * floor plan — 4 / 5 / 5 / 5, left to right, top to bottom. Positions
 * 1-19. Shared by the admin assignment editor and the public map so
 * they can never drift apart.
 */
export const FACULTY_ROWS: number[][] = [
  [1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
];

/**
 * Row shape of the 8 numbered "External booth" slots on the real printed
 * floor plan — 4 / 4, beneath the faculty booths. Positions 20-27.
 */
export const EXTERNAL_ROWS: number[][] = [
  [20, 21, 22, 23],
  [24, 25, 26, 27],
];

export const FIRST_EXTERNAL_POSITION = 20;
export const TOTAL_POSITIONS = 27;

export const VENUE_NAME = 'Marquee Tent, High Impact Research Building, Universiti Malaya';
