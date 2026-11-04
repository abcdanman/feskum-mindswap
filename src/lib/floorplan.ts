/**
 * The 17 numbered faculty booth positions on the venue floor plan
 * (MS Latest Floorplan). Index 0 = map_label 1, and so on. The physical
 * map just shows generic "Fac. booth" slots — these names are only here
 * so admin can tell them apart while assigning booths to positions.
 */
export const MAP_LABELS: string[] = [
  'Fakulti Sains',
  'Akademi Pengajian Islam',
  'Fakulti Kejuruteraan',
  'Fakulti Pendidikan',
  'Fakulti Sastera dan Sains Sosial',
  'Fakulti Seni Kreatif',
  'Fakulti Sukan dan Eksesais',
  'Fakulti Undang-Undang',
  'Akademi Pengajian Melayu',
  'Fakulti Alam Bina',
  'Fakulti Bahasa dan Linguistik',
  'Fakulti Perniagaan dan Ekonomi',
  'Fakulti Sains Komputer dan Teknologi Maklumat',
  'Fakulti Farmasi',
  'Fakulti Pergigian',
  'Fakulti Perubatan',
  'Fakulti Kejururawatan',
];

/**
 * Row shape of the 17 numbered "Fac. booth" slots on the real printed
 * floor plan (MS Latest Floorplan — 4 / 4 / 5 / 4 left to right, top to
 * bottom). Shared by the admin assignment editor and the public map so
 * they can never drift apart.
 */
export const MAP_ROWS: number[][] = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12, 13],
  [14, 15, 16, 17],
];

export const VENUE_NAME = 'Marquee Tent, High Impact Research Building, Universiti Malaya';
