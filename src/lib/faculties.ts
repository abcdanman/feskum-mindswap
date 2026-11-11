/**
 * Single source of truth for the faculty picker.
 * Students only — no "visitor / non-UM guest" option.
 */
export const FACULTIES = [
  'Faculty of Engineering',
  'Faculty of Computer Science & IT',
  'Faculty of Science',
  'Faculty of Medicine',
  'Faculty of Dentistry',
  'Faculty of Built Environment',
  'Faculty of Arts & Social Sciences',
  'Faculty of Business & Economics',
  'Faculty of Law',
  'Faculty of Education',
  'Faculty of Pharmacy',
  'Faculty of Creative Arts',
  'Faculty of Languages & Linguistics',
  'Faculty of Sports & Exercise Science',
  'Academy of Islamic Studies',
  'Academy of Malay Studies',
  'UM Makers Club',
  'Others',
] as const;

export type Faculty = (typeof FACULTIES)[number];

/** Short codes for tight spaces (the floor-plan map's tiny slots) where a
 * real faculty name has to fit without wrapping or an ellipsis — full name
 * stays one tap away via the booth's own detail view, so this never needs
 * to carry the full meaning on its own. */
const FACULTY_CODES: Record<string, string> = {
  'Faculty of Engineering': 'ENG',
  'Faculty of Computer Science & IT': 'CS & IT',
  'Faculty of Science': 'SCIENCE',
  'Faculty of Medicine': 'MEDICINE',
  'Faculty of Dentistry': 'DENTISTRY',
  'Faculty of Built Environment': 'BUILT ENV',
  'Faculty of Arts & Social Sciences': 'ARTS',
  'Faculty of Business & Economics': 'BIZ & ECON',
  'Faculty of Law': 'LAW',
  'Faculty of Education': 'EDUCATION',
  'Faculty of Pharmacy': 'PHARMACY',
  'Faculty of Creative Arts': 'CREATIVE ARTS',
  'Faculty of Languages & Linguistics': 'LANGUAGES',
  'Faculty of Sports & Exercise Science': 'SPORTS SCI',
  'Academy of Islamic Studies': 'ISLAMIC',
  'Academy of Malay Studies': 'MALAY STD',
  'UM Makers Club': 'MAKERS',
  Others: 'OTHER',
};

function normalizeFacultyKey(s: string): string {
  return s.trim().toLowerCase().replace(/^faculty of\s+/i, '').replace(/^academy of\s+/i, '');
}

const NORMALIZED_CODES = new Map(Object.entries(FACULTY_CODES).map(([k, v]) => [normalizeFacultyKey(k), v]));

export function facultyCode(faculty: string): string {
  const hit = NORMALIZED_CODES.get(normalizeFacultyKey(faculty));
  if (hit) return hit;

  // Fallback for anything not in the table above — a partner/external
  // booth's "faculty" field is usually just its sponsor's name, which
  // won't match a UM faculty. Build up whole words until the next one
  // would blow the budget, so it never cuts a word in half (no more
  // "SPORTS & E" or "MATCHA CLU").
  const words = faculty
    .replace(/^Faculty of\s+/i, '')
    .replace(/^Academy of\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(w => w !== '&');
  let out = '';
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > 10 && out) break;
    out = next;
    if (out.length >= 10) break;
  }
  return (out || faculty).toUpperCase();
}
