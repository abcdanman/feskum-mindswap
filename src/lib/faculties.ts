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
