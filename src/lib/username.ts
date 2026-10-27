import type { RegExpMatcher } from 'obscenity';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

export const USERNAME_RULES =
  '3–20 characters, starts with a letter, lowercase letters/numbers/underscores only, no double or trailing underscore.';

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'system',
  'mod',
  'moderator',
  'staff',
  'official',
  'helpdesk',
  'support',
  'security',
  'mindswap',
  'feskum',
  'laluan',
  'laluanaspirasi',
  'organizer',
  'organiser',
  'committee',
  'crew',
  'volunteer',
  'guest',
  'anonymous',
  'unknown',
  'null',
  'undefined',
  'test',
  'demo',
  'user',
  'username',
  'profile',
  'leaderboard',
  'passport',
  'scan',
  'booth',
  'partner',
  'speaker',
  'talks',
  'vote',
  'reward',
  'admin2026',
  'mindswap2026',
  'feskum2026',
]);

const RESERVED_PREFIXES = [
  'admin',
  'official',
  'staff',
  'helpdesk',
  'mindswap',
  'feskum',
  'laluanaspirasi',
  'organizer',
  'organiser',
  'support',
  'security',
];

const CUSTOM_BLOCKED_TERMS = [
  'babi',
  'bangsat',
  'bodoh',
  'sial',
  'pukimak',
  'kimak',
  'lancau',
  'cibai',
  'pantat',
  'tetek',
  'konek',
  'butuh',
  'jubur',
  'mampus',
  'setan',
  'pelacur',
  'lucah',
  'porno',
  'zakar',
  'faraj',
  'muncrat',
  'ngewe',
  'coli',
  'bugil',
  'telanjang',
  'puki',
  'kontol',
  'memek',
  'ngentot',
  'pepek',
  'itil',
  'jembut',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'dick',
  'pussy',
  'cock',
  'cunt',
  'slut',
  'whore',
  'rape',
  'nazi',
  'hitler',
  'sex',
];

const SAFE_TERMS = [
  'analysis',
  'analyst',
  'assist',
  'assistant',
  'assumption',
  'button',
  'butter',
  'circumstance',
  'classic',
  'class',
  'cocktail',
  'cucumber',
  'cumberland',
  'cumbria',
  'dickens',
  'dickson',
  'document',
  'documentary',
  'essex',
  'grape',
  'hancock',
  'hitchcock',
  'lightwater',
  'peacock',
  'penistone',
  'scunthorpe',
  'shiitake',
  'sussex',
  'therapist',
  'woodcock',
];

const SAFE_LIBRARY_PREFIXES = ['dickson', 'penistone', 'shiitake'];

export function normalizeUsernameInput(value: string): string {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

export function normalizeForMatch(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compactForMatch(value: string): string {
  return normalizeForMatch(value).replace(/\s+/g, '');
}

function isSafeUsername(value: string): boolean {
  if (SAFE_TERMS.includes(value)) return true;
  return SAFE_LIBRARY_PREFIXES.some(prefix => {
    return value.startsWith(prefix) && /^[0-9_]*$/.test(value.slice(prefix.length));
  });
}

function containsCustomBlockedTerm(value: string): boolean {
  const spaced = ` ${normalizeForMatch(value)} `;
  const compact = compactForMatch(value);
  const compactWithoutDigits = compact.replace(/\d+$/, '');

  return CUSTOM_BLOCKED_TERMS.some(term => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (
      new RegExp(`(^| )${escaped}( |$)`).test(spaced) ||
      compact === term ||
      compactWithoutDigits === term
    );
  });
}

let matcherPromise: Promise<RegExpMatcher> | null = null;

async function getMatcher(): Promise<RegExpMatcher> {
  if (!matcherPromise) {
    matcherPromise = import('obscenity').then(
      ({ RegExpMatcher, englishDataset, englishRecommendedTransformers }) => {
        const base = englishDataset.build();
        return new RegExpMatcher({
          ...base,
          whitelistedTerms: [...(base.whitelistedTerms ?? []), ...SAFE_TERMS],
          ...englishRecommendedTransformers,
        });
      }
    );
  }
  return matcherPromise;
}

export type UsernameValidation =
  | { ok: true; username: string; error?: never }
  | { ok: false; username: string; error: string };

export function validateUsernameFormat(value: string): UsernameValidation {
  const username = normalizeUsernameInput(value);

  if (!username) {
    return { ok: false, username, error: 'Choose a username.' };
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return { ok: false, username, error: `Use at least ${USERNAME_MIN_LENGTH} characters.` };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { ok: false, username, error: `Use ${USERNAME_MAX_LENGTH} characters or fewer.` };
  }
  if (!/^[a-z][a-z0-9_]*$/.test(username)) {
    return {
      ok: false,
      username,
      error: 'Start with a letter and use lowercase letters, numbers, or underscores only.',
    };
  }
  if (username.includes('__')) {
    return { ok: false, username, error: 'Use single underscores only.' };
  }
  if (username.endsWith('_')) {
    return { ok: false, username, error: 'Do not end with an underscore.' };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, username, error: 'That username is reserved. Try another.' };
  }
  if (RESERVED_PREFIXES.some(prefix => username.startsWith(prefix))) {
    return { ok: false, username, error: 'That username is reserved. Try another.' };
  }

  return { ok: true, username };
}

export async function checkUsernameContent(value: string): Promise<UsernameValidation> {
  const format = validateUsernameFormat(value);
  if (!format.ok) return format;

  if (containsCustomBlockedTerm(format.username)) {
    return {
      ok: false,
      username: format.username,
      error: 'That username is not allowed. Please choose another.',
    };
  }

  if (isSafeUsername(format.username)) {
    return format;
  }

  const matcher = await getMatcher();
  if (matcher.hasMatch(format.username)) {
    return {
      ok: false,
      username: format.username,
      error: 'That username is not allowed. Please choose another.',
    };
  }

  return format;
}

export async function validateUsername(value: string): Promise<UsernameValidation> {
  return checkUsernameContent(value);
}

export function getUsernameSuggestions(base: string): string[] {
  const root = normalizeUsernameInput(base)
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safeRoot = /^[a-z]/.test(root) ? root.slice(0, 16) : `user${root}`.slice(0, 16);
  const candidates = [`${safeRoot}_2`, `${safeRoot}_7`, `${safeRoot}13`];
  return Array.from(
    new Set(
      candidates
        .map(candidate => candidate.replace(/_+$/g, ''))
        .filter(candidate => /^[a-z][a-z0-9_]{2,19}$/.test(candidate))
    )
  );
}
