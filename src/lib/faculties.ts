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

export function facultyCode(faculty: string): string {
  return FACULTY_CODES[faculty] || faculty.replace(/^Faculty of\s+/i, '').slice(0, 10).toUpperCase();
}
