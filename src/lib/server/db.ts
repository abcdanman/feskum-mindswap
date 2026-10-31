import 'server-only';
import crypto from 'node:crypto';
import {
  type AdminAnalyticsVisitor,
  type BoothAnalytics,
  type BoothVisit,
  type Checkpoint,
  type LeaderboardDay,
  type LeaderboardEntry,
  type QuizQuestion,
  type RankingMetric,
  type RewardSetting,
  type Speaker,
  type SpeakerVote,
  type VisitorReward,
} from '@/lib/types';
import { INITIAL_CHECKPOINTS, INITIAL_REWARD_SETTING, INITIAL_SPEAKERS } from '@/lib/mockData';
import { getLeaderboardScore, calculateQuizScore, QUIZ_MAX_QUESTIONS } from '@/lib/scoring';
import { getLeaderboardDayRange } from '@/lib/event';
import { validateUsername } from '@/lib/username';
import { getSupabaseAdmin, hasServerSupabase } from './supabaseAdmin';

const VOTING_EVENT_ID = '00000000-0000-0000-0000-000000000002';

function db() {
  return getSupabaseAdmin();
}

function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Visitor';
  if (parts.length === 1) {
    const name = parts[0];
    if (name.length <= 2) return `${name.charAt(0)}*`;
    return `${name.charAt(0)}${'*'.repeat(Math.max(1, name.length - 2))}${name.charAt(name.length - 1)}`;
  }
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

function publicVisitorId(visitorIds: string[]): string {
  return crypto
    .createHmac('sha256', process.env.SESSION_SECRET || 'mindswap')
    .update([...visitorIds].sort().join('|'))
    .digest('hex')
    .slice(0, 12);
}

function sanitizeCheckpoint(checkpoint: Checkpoint): Checkpoint {
  if (!checkpoint || !Array.isArray(checkpoint.quiz)) return checkpoint;
  return {
    ...checkpoint,
    quiz: checkpoint.quiz.map(question => ({
      id: question.id,
      question: question.question,
      options: question.options,
    })) as QuizQuestion[],
  };
}

function sanitizeVisit(visit: BoothVisit): BoothVisit {
  return visit.checkpoint ? { ...visit, checkpoint: sanitizeCheckpoint(visit.checkpoint) } : visit;
}

// -------------------------------------------------------------
// CHECKPOINTS
// -------------------------------------------------------------
export async function listCheckpoints(includeInactive = false, publicView = true): Promise<Checkpoint[]> {
  if (!hasServerSupabase()) {
    const local = includeInactive
      ? INITIAL_CHECKPOINTS
      : INITIAL_CHECKPOINTS.filter(checkpoint => checkpoint.is_active !== false);
    return publicView ? local.map(sanitizeCheckpoint) : local;
  }

  let query = db().from('checkpoints').select('*').order('display_order', { ascending: true });
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error || !data) return [];
  return (publicView ? data.map(sanitizeCheckpoint) : data) as Checkpoint[];
}

export async function getCheckpointByToken(token: string): Promise<Checkpoint | null> {
  if (!hasServerSupabase()) {
    const found = INITIAL_CHECKPOINTS.find(checkpoint => checkpoint.qr_token === token || checkpoint.id === token);
    return found && found.is_active !== false ? sanitizeCheckpoint(found) : null;
  }
  const { data, error } = await db()
    .from('checkpoints')
    .select('*')
    .eq('qr_token', token)
    .maybeSingle();
  if (!error && data) return data.is_active === false ? null : sanitizeCheckpoint(data as Checkpoint);
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const byId = await getCheckpointById(token);
  return byId && byId.is_active !== false ? sanitizeCheckpoint(byId) : null;
}

export async function getCheckpointById(id: string): Promise<Checkpoint | null> {
  const { data, error } = await db().from('checkpoints').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as Checkpoint;
}

export async function saveCheckpoint(
  checkpoint: Partial<Checkpoint>
): Promise<{ data: Checkpoint | null; error: string | null }> {
  if (!hasServerSupabase()) return { data: null, error: 'Server database is not configured.' };
  const payload = {
    ...(checkpoint.id ? { id: checkpoint.id } : {}),
    name: checkpoint.name,
    faculty: checkpoint.faculty,
    category: checkpoint.category,
    description: checkpoint.description,
    location: checkpoint.location,
    image_url: checkpoint.image_url ?? null,
    qr_token: checkpoint.qr_token,
    booth_type: checkpoint.booth_type ?? 'required',
    quiz: checkpoint.quiz ?? [],
    is_active: checkpoint.is_active ?? true,
    display_order: checkpoint.display_order ?? 0,
  };
  if (!payload.qr_token && payload.name) {
    payload.qr_token = `qr-${crypto.randomUUID().slice(0, 8)}`;
  }
  if (!checkpoint.id) {
    const existing = await listCheckpoints(true, false);
    payload.display_order = checkpoint.display_order ?? existing.length + 1;
  }
  const { data, error } = await db().from('checkpoints').upsert(payload).select().single();
  if (error || !data) return { data: null, error: error?.message || 'Failed to save booth.' };
  return { data: data as Checkpoint, error: null };
}

export async function deleteCheckpoint(id: string): Promise<{ error: string | null }> {
  if (!hasServerSupabase()) return { error: 'Server database is not configured.' };
  const { error } = await db().from('checkpoints').delete().eq('id', id);
  return { error: error?.message || null };
}

// -------------------------------------------------------------
// VISITS, RATINGS, QUIZZES
// -------------------------------------------------------------
export async function listVisitorVisits(visitorId: string): Promise<BoothVisit[]> {
  if (!hasServerSupabase()) return [];
  const { data, error } = await db()
    .from('booth_visits')
    .select('*, checkpoint:checkpoints(*)')
    .eq('visitor_id', visitorId);
  if (error || !data) return [];
  return (data as BoothVisit[]).map(sanitizeVisit);
}

export async function submitBoothRating(
  visitorId: string,
  checkpointId: string,
  rating: number,
  review?: string
): Promise<{ success: boolean; visit?: BoothVisit; message?: string }> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, message: 'Choose a rating from 1 to 5 stars.' };
  }
  const cleanReview = typeof review === 'string' ? review.trim().slice(0, 240) : '';
  const checkpoint = await getCheckpointById(checkpointId);
  if (!checkpoint || checkpoint.is_active === false) {
    return { success: false, message: 'This booth is not available.' };
  }

  const existing = await listVisitorVisits(visitorId);
  if (existing.some(visit => visit.checkpoint_id === checkpointId)) {
    return { success: false, message: "You've already collected this stamp!" };
  }

  const { data, error } = await db()
    .from('booth_visits')
    .insert({
      visitor_id: visitorId,
      checkpoint_id: checkpointId,
      rating,
      review: cleanReview || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: "You've already collected this stamp!" };
    }
    console.error('submitBoothRating:', error.message);
    return { success: false, message: 'Could not save your stamp. Check your connection and try again.' };
  }
  return { success: true, visit: data as BoothVisit };
}

export async function submitBoothQuiz(
  visitorId: string,
  checkpointId: string,
  answers: Array<number | null>
): Promise<{
  success: boolean;
  visit?: BoothVisit;
  correct: number;
  total: number;
  points: number;
  message?: string;
}> {
  const checkpoint = await getCheckpointById(checkpointId);
  const quizQuestions = (checkpoint?.quiz || []).slice(0, QUIZ_MAX_QUESTIONS);
  if (!checkpoint || checkpoint.is_active === false || !quizQuestions.length) {
    return { success: false, correct: 0, total: 0, points: 0, message: 'This booth has no quiz.' };
  }

  const visits = await listVisitorVisits(visitorId);
  const existing = visits.find(visit => visit.checkpoint_id === checkpointId);
  if (!existing) {
    return { success: false, correct: 0, total: quizQuestions.length, points: 0, message: 'Collect the stamp first.' };
  }
  if (existing.quiz_completed_at) {
    return { success: false, correct: 0, total: quizQuestions.length, points: 0, message: 'You already completed this quiz.' };
  }

  const safeAnswers = quizQuestions.map((question, index) => {
    const answer = answers[index];
    return typeof answer === 'number' && Number.isInteger(answer) && answer >= 0 && answer < question.options.length ? answer : null;
  });
  const score = calculateQuizScore(quizQuestions, safeAnswers);

  const { data, error } = await db()
    .from('booth_visits')
    .update({
      quiz_correct: score.correct,
      quiz_total: score.total,
      quiz_points: score.points,
      quiz_completed_at: new Date().toISOString(),
    })
    .eq('visitor_id', visitorId)
    .eq('checkpoint_id', checkpointId)
    .select()
    .single();

  if (error || !data) {
    console.error('submitBoothQuiz:', error?.message);
    return { success: false, ...score, message: 'Could not save your quiz. Check your connection and try again.' };
  }
  return { success: true, visit: data as BoothVisit, ...score };
}

// -------------------------------------------------------------
// REWARDS
// -------------------------------------------------------------
export async function getRewardSetting(): Promise<RewardSetting> {
  if (!hasServerSupabase()) return INITIAL_REWARD_SETTING;
  const { data, error } = await db()
    .from('reward_settings')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return INITIAL_REWARD_SETTING;
  return { ranking_metric: 'points', ...data } as RewardSetting;
}

export async function saveRewardSetting(setting: Partial<RewardSetting>): Promise<{ data: RewardSetting; error: string | null }> {
  const current = await getRewardSetting();
  const updated = { ...current, ...setting };
  if (!hasServerSupabase()) return { data: updated, error: 'Server database is not configured.' };
  const { error } = await db().from('reward_settings').upsert(updated);
  return { data: updated, error: error?.message || null };
}

export async function getVisitorReward(visitorId: string): Promise<VisitorReward | null> {
  if (!hasServerSupabase()) return null;
  const { data, error } = await db()
    .from('visitor_rewards')
    .select('*')
    .eq('visitor_id', visitorId)
    .maybeSingle();
  if (error || !data) return null;
  return data as VisitorReward;
}

export async function unlockVisitorReward(visitorId: string): Promise<VisitorReward | null> {
  const setting = await getRewardSetting();
  const existing = await getVisitorReward(visitorId);
  if (existing) return existing;

  const visits = await listVisitorVisits(visitorId);
  const requiredStamps = visits.filter(visit => (visit.checkpoint?.booth_type ?? 'required') !== 'partner').length;
  if (requiredStamps < setting.stamp_threshold) return null;

  if (!hasServerSupabase()) return null;
  const { data, error } = await db()
    .from('visitor_rewards')
    .insert({ visitor_id: visitorId, reward_id: setting.id, status: 'unlocked' })
    .select()
    .single();
  if (error?.code === '23505') return getVisitorReward(visitorId);
  if (error || !data) return null;
  return data as VisitorReward;
}

export async function claimVisitorReward(
  visitorId: string,
  staffName = 'Staff Helpdesk'
): Promise<VisitorReward | null> {
  if (!hasServerSupabase()) return null;
  const { data, error } = await db()
    .from('visitor_rewards')
    .update({
      status: 'claimed',
      claimed_at: new Date().toISOString(),
      claimed_by_staff: staffName.slice(0, 80),
    })
    .eq('visitor_id', visitorId)
    .select()
    .maybeSingle();
  if (error || !data) return null;
  return data as VisitorReward;
}

// -------------------------------------------------------------
// VISITOR IDENTITY
// -------------------------------------------------------------
export interface VisitorIdentityInput {
  name: string;
  username: string;
  matric: string;
  faculty: string;
  showOnLeaderboard: boolean;
}

export interface VisitorSessionInfo {
  visitorId: string;
  identity: {
    name: string;
    username: string;
    matric: string;
    faculty: string;
    showOnLeaderboard: boolean;
  };
}

export async function getVisitorSession(visitorId: string): Promise<VisitorSessionInfo | null> {
  if (!hasServerSupabase()) return null;
  const { data, error } = await db()
    .from('visitors')
    .select('id, display_name, username, student_id, faculty, show_on_leaderboard')
    .eq('id', visitorId)
    .maybeSingle();
  if (error || !data?.id) return null;
  return {
    visitorId: data.id,
    identity: {
      name: data.display_name || '',
      username: data.username || '',
      matric: data.student_id || '',
      faculty: data.faculty || '',
      showOnLeaderboard: data.show_on_leaderboard !== false,
    },
  };
}

export async function adoptLegacySession(
  legacyId: string,
  username: string,
  matric: string
): Promise<VisitorSessionInfo | null> {
  const session = await getVisitorSession(legacyId);
  if (!session) return null;
  const usernameMatches = Boolean(username) && session.identity.username === username.trim().toLowerCase();
  const matricMatches = Boolean(matric) && session.identity.matric === matric.trim();
  if (!usernameMatches && !matricMatches) return null;
  return session;
}

async function usernameOwner(username: string, excludeId?: string): Promise<string | null> {
  const { data } = await db().from('visitors').select('id').eq('username', username).maybeSingle();
  if (data?.id && data.id !== excludeId) return data.id;
  return null;
}

export async function registerVisitor(
  input: VisitorIdentityInput,
  currentVisitorId?: string | null
): Promise<{ visitorId: string; reclaimed: boolean; error: string | null }> {
  const usernameCheck = await validateUsername(input.username);
  if (!usernameCheck.ok) {
    return { visitorId: currentVisitorId || '', reclaimed: false, error: usernameCheck.error };
  }
  const name = input.name.trim().slice(0, 80);
  const faculty = input.faculty.trim().slice(0, 120);
  const matric = input.matric.trim().slice(0, 40) || null;
  const username = usernameCheck.username;
  if (!name || !faculty) {
    return { visitorId: currentVisitorId || '', reclaimed: false, error: 'Please fill in your name and faculty.' };
  }
  if (!hasServerSupabase()) {
    return { visitorId: currentVisitorId || crypto.randomUUID(), reclaimed: false, error: 'Server database is not configured.' };
  }

  const payload = {
    display_name: name,
    username,
    student_id: matric,
    faculty,
    show_on_leaderboard: input.showOnLeaderboard,
  };

  if (currentVisitorId) {
    const owner = await usernameOwner(username, currentVisitorId);
    if (owner) {
      return { visitorId: currentVisitorId, reclaimed: false, error: 'That username is already taken. Please choose another.' };
    }
    const { error } = await db().from('visitors').update(payload).eq('id', currentVisitorId);
    if (error) {
      console.error('registerVisitor update:', error.message);
      return { visitorId: currentVisitorId, reclaimed: false, error: 'Could not save your profile. Check your connection and try again.' };
    }
    return { visitorId: currentVisitorId, reclaimed: false, error: null };
  }

  if (matric) {
    const { data: existing } = await db()
      .from('visitors')
      .select('id, username')
      .eq('student_id', matric)
      .maybeSingle();
    if (existing?.id) {
      if (existing.username && existing.username !== username) {
        return {
          visitorId: existing.id,
          reclaimed: false,
          error: 'That matric number is already registered. Use the same username to restore your passport.',
        };
      }
      const owner = await usernameOwner(username, existing.id);
      if (owner) {
        return { visitorId: existing.id, reclaimed: true, error: 'That username is already taken. Please choose another.' };
      }
      const { error } = await db().from('visitors').update(payload).eq('id', existing.id);
      if (error) {
        return { visitorId: existing.id, reclaimed: true, error: 'Could not save your profile. Check your connection and try again.' };
      }
      return { visitorId: existing.id, reclaimed: true, error: null };
    }
  }

  const owner = await usernameOwner(username);
  if (owner) {
    return { visitorId: '', reclaimed: false, error: 'That username is already taken. Please choose another.' };
  }

  const visitorId = crypto.randomUUID();
  const { error } = await db().from('visitors').insert({ id: visitorId, ...payload });
  if (error) {
    if (error.code === '23505') {
      return { visitorId: '', reclaimed: false, error: 'That username or matric number is already registered. Please sign in with your existing details.' };
    }
    console.error('registerVisitor insert:', error.message);
    return { visitorId: '', reclaimed: false, error: 'Could not save your profile. Check your connection and try again.' };
  }
  return { visitorId, reclaimed: false, error: null };
}

export async function isUsernameAvailable(
  username: string,
  currentVisitorId?: string | null
): Promise<{ available: boolean; error?: string }> {
  if (!hasServerSupabase()) return { available: true };
  const normalized = username.trim().replace(/^@+/, '').toLowerCase();
  if (!normalized) return { available: false };
  const { data, error } = await db().from('visitors').select('id').eq('username', normalized).maybeSingle();
  if (error) return { available: false, error: 'Could not check that username. Try again.' };
  if (!data?.id || data.id === currentVisitorId) return { available: true };
  return { available: false };
}

export async function findVisitorByUsername(username: string): Promise<AdminAnalyticsVisitor | null> {
  if (!hasServerSupabase()) return null;
  const normalized = username.trim().replace(/^@+/, '').toLowerCase();
  const { data, error } = await db()
    .from('visitors')
    .select('id, display_name, username, student_id, faculty')
    .eq('username', normalized)
    .maybeSingle();
  if (error || !data) return null;
  return data as AdminAnalyticsVisitor;
}

// -------------------------------------------------------------
// LEADERBOARD
// -------------------------------------------------------------
interface RawRankRow {
  visitor_id: string;
  visitor_ids: string[];
  required_stamps: number;
  partner_stamps: number;
  quiz_points: number;
  partner_trail_complete: boolean;
  partner_completion_at: string | null;
  rating_sum: number;
  votes: number;
  name: string;
  username: string | null;
}

interface VisitorRow {
  id: string;
  display_name: string | null;
  username: string | null;
  show_on_leaderboard: boolean | null;
  student_id: string | null;
}

interface VisitRow {
  visitor_id: string;
  checkpoint_id: string;
  rating: number;
  visited_at: string;
  quiz_points?: number | null;
}

interface VoteRow {
  visitor_id: string;
  created_at?: string | null;
}

function isWithinRange(timestamp: string | null | undefined, range: { start: string; end: string } | null): boolean {
  if (!range) return true;
  if (!timestamp) return false;
  const time = new Date(timestamp).getTime();
  return time >= new Date(range.start).getTime() && time < new Date(range.end).getTime();
}

async function buildRankingRows(day: LeaderboardDay = 'all'): Promise<RawRankRow[]> {
  if (!hasServerSupabase()) return [];
  const [visitsRes, votesRes, visitorsRes, checkpointsRes] = await Promise.all([
    db().from('booth_visits').select('visitor_id, checkpoint_id, rating, visited_at, quiz_points'),
    db().from('speaker_votes').select('visitor_id, created_at'),
    db().from('visitors').select('id, display_name, username, show_on_leaderboard, student_id'),
    db().from('checkpoints').select('id, booth_type, is_active'),
  ]);

  const visits = (visitsRes.data || []) as VisitRow[];
  const votes = (votesRes.data || []) as VoteRow[];
  const visitors = (visitorsRes.data || []) as VisitorRow[];
  const checkpoints = (checkpointsRes.data || []) as { id: string; booth_type?: string | null; is_active?: boolean | null }[];
  if (!visits.length && !votes.length) return [];

  const boothTypeById = new Map(
    checkpoints.map(checkpoint => [checkpoint.id, checkpoint.booth_type === 'partner' ? 'partner' : 'required'] as const)
  );
  const partnerIds = new Set(
    checkpoints.filter(checkpoint => checkpoint.is_active !== false && checkpoint.booth_type === 'partner').map(c => c.id)
  );
  const typeOf = (checkpointId: string) => boothTypeById.get(checkpointId) || 'required';
  const range = getLeaderboardDayRange(day);
  const visitorMap = new Map(visitors.map(visitor => [visitor.id, visitor]));

  const byVisitor = new Map<
    string,
    {
      visitor_ids: Set<string>;
      requiredStamps: Set<string>;
      partnerStamps: Set<string>;
      quiz_points: number;
      rating_sum: number;
      votes: number;
      sampleVisitorId: string;
    }
  >();
  const keyFor = (visitorId: string) => {
    const visitor = visitorMap.get(visitorId);
    return visitor?.student_id ? `sid:${visitor.student_id}` : `vid:${visitorId}`;
  };
  const ensure = (key: string, visitorId: string) => {
    let row = byVisitor.get(key);
    if (!row) {
      row = {
        visitor_ids: new Set(),
        requiredStamps: new Set(),
        partnerStamps: new Set(),
        quiz_points: 0,
        rating_sum: 0,
        votes: 0,
        sampleVisitorId: visitorId,
      };
      byVisitor.set(key, row);
    }
    row.visitor_ids.add(visitorId);
    return row;
  };

  const partnerVisitsByKey = new Map<string, { checkpointIds: Set<string>; latest: string }>();
  visits.forEach(visit => {
    if (typeOf(visit.checkpoint_id) !== 'partner') return;
    const key = keyFor(visit.visitor_id);
    let trail = partnerVisitsByKey.get(key);
    if (!trail) {
      trail = { checkpointIds: new Set(), latest: visit.visited_at };
      partnerVisitsByKey.set(key, trail);
    }
    trail.checkpointIds.add(visit.checkpoint_id);
    if (new Date(visit.visited_at).getTime() > new Date(trail.latest).getTime()) {
      trail.latest = visit.visited_at;
    }
  });

  visits
    .filter(visit => isWithinRange(visit.visited_at, range))
    .forEach(visit => {
      const row = ensure(keyFor(visit.visitor_id), visit.visitor_id);
      const type = typeOf(visit.checkpoint_id);
      if (type === 'partner') {
        if (!row.partnerStamps.has(visit.checkpoint_id)) {
          row.partnerStamps.add(visit.checkpoint_id);
          row.rating_sum += visit.rating || 0;
        }
      } else if (!row.requiredStamps.has(visit.checkpoint_id)) {
        row.requiredStamps.add(visit.checkpoint_id);
        row.rating_sum += visit.rating || 0;
      }
      row.quiz_points += visit.quiz_points || 0;
    });

  votes
    .filter(vote => isWithinRange(vote.created_at, range))
    .forEach(vote => {
      ensure(keyFor(vote.visitor_id), vote.visitor_id).votes += 1;
    });

  const rows: RawRankRow[] = [];
  byVisitor.forEach((row, key) => {
    const groupVisitors = [...row.visitor_ids]
      .map(id => visitorMap.get(id))
      .filter((visitor): visitor is VisitorRow => Boolean(visitor));
    const showOk = groupVisitors.length > 0 && groupVisitors.every(visitor => visitor.show_on_leaderboard !== false);
    const rawName = groupVisitors.find(visitor => visitor.display_name)?.display_name || 'Visitor';
    const username = groupVisitors.find(visitor => visitor.username)?.username || null;
    const trail = partnerVisitsByKey.get(key);
    const partnerTrailComplete =
      partnerIds.size > 0 && Boolean(trail) && [...partnerIds].every(id => trail!.checkpointIds.has(id));

    rows.push({
      visitor_id: row.sampleVisitorId,
      visitor_ids: [...row.visitor_ids],
      required_stamps: row.requiredStamps.size,
      partner_stamps: row.partnerStamps.size,
      quiz_points: row.quiz_points,
      partner_trail_complete: partnerTrailComplete,
      partner_completion_at: partnerTrailComplete && trail ? trail.latest : null,
      rating_sum: row.rating_sum,
      votes: row.votes,
      name: showOk ? rawName : '',
      username: showOk ? username : null,
    });
  });
  return rows;
}

function scoreRow(row: RawRankRow, metric: RankingMetric, day: LeaderboardDay): number {
  if (metric === 'points') {
    const range = getLeaderboardDayRange(day);
    const trailBonus = row.partner_trail_complete && isWithinRange(row.partner_completion_at, range) ? 1 : 0;
    return getLeaderboardScore({
      requiredStamps: row.required_stamps,
      partnerStamps: row.partner_stamps,
      quizPoints: row.quiz_points,
      votes: row.votes,
      partnerTrailComplete: Boolean(trailBonus),
    });
  }
  return row.required_stamps + row.partner_stamps;
}

function compareRows(a: RawRankRow, b: RawRankRow, metric: RankingMetric, day: LeaderboardDay): number {
  const avg = (row: RawRankRow) => {
    const totalStamps = row.required_stamps + row.partner_stamps;
    return totalStamps > 0 ? row.rating_sum / totalStamps : 0;
  };
  const scoreDiff = scoreRow(b, metric, day) - scoreRow(a, metric, day);
  if (scoreDiff) return scoreDiff;
  const requiredDiff = b.required_stamps - a.required_stamps;
  if (requiredDiff) return requiredDiff;
  return avg(b) - avg(a);
}

function toEntry(
  row: RawRankRow,
  rank: number,
  metric: RankingMetric,
  day: LeaderboardDay,
  myVisitorId?: string | null
): LeaderboardEntry {
  const totalStamps = row.required_stamps + row.partner_stamps;
  return {
    rank,
    visitor_id: publicVisitorId(row.visitor_ids),
    name: row.name ? row.username || maskName(row.name) : 'Anonymous',
    username: row.username,
    stamps: totalStamps,
    required_stamps: row.required_stamps,
    partner_stamps: row.partner_stamps,
    quiz_points: row.quiz_points,
    partner_trail_complete: row.partner_trail_complete,
    avg_rating: Number((totalStamps > 0 ? row.rating_sum / totalStamps : 0).toFixed(2)),
    votes: row.votes,
    points: scoreRow(row, metric, day),
    is_you: myVisitorId ? row.visitor_ids.includes(myVisitorId) : false,
  };
}

export async function getLeaderboard(
  limit = 10,
  metric: RankingMetric = 'points',
  myVisitorId?: string | null,
  day: LeaderboardDay = 'all'
): Promise<LeaderboardEntry[]> {
  const rows = await buildRankingRows(day);
  return rows
    .filter(row => row.required_stamps + row.partner_stamps > 0)
    .sort((a, b) => compareRows(a, b, metric, day))
    .slice(0, Math.min(Math.max(limit, 1), 500))
    .map((row, index) => toEntry(row, index + 1, metric, day, myVisitorId));
}

export async function getVisitorRank(
  visitorId: string,
  metric: RankingMetric = 'points',
  day: LeaderboardDay = 'all'
): Promise<{ rank: number; total: number; entry: LeaderboardEntry | null }> {
  const rows = await buildRankingRows(day);
  const sorted = rows
    .filter(row => row.required_stamps + row.partner_stamps > 0)
    .sort((a, b) => compareRows(a, b, metric, day));
  const index = sorted.findIndex(row => row.visitor_ids.includes(visitorId));
  if (index === -1) return { rank: 0, total: sorted.length, entry: null };
  return {
    rank: index + 1,
    total: sorted.length,
    entry: toEntry(sorted[index], index + 1, metric, day, visitorId),
  };
}

// -------------------------------------------------------------
// SPEAKERS & VOTING
// -------------------------------------------------------------
export async function listSpeakers(includeInactive = false): Promise<Speaker[]> {
  if (!hasServerSupabase()) {
    const local = includeInactive ? INITIAL_SPEAKERS : INITIAL_SPEAKERS.filter(speaker => speaker.is_active !== false);
    return local.map(speaker => ({ ...speaker, vote_count: speaker.vote_count || 0 }));
  }
  let query = db().from('speakers').select('*').order('display_order', { ascending: true });
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error || !data) return [];
  const { data: votes } = await db().from('speaker_votes').select('speaker_id');
  const counts = new Map<string, number>();
  (votes || []).forEach((vote: { speaker_id: string }) => {
    counts.set(vote.speaker_id, (counts.get(vote.speaker_id) || 0) + 1);
  });
  return (data as Speaker[]).map(speaker => ({ ...speaker, vote_count: counts.get(speaker.id) || 0 }));
}

export async function saveSpeaker(speaker: Partial<Speaker>): Promise<{ data: Speaker | null; error: string | null }> {
  if (!hasServerSupabase()) return { data: null, error: 'Server database is not configured.' };
  let displayOrder = speaker.display_order;
  if (!speaker.id && displayOrder == null) {
    const existing = await listSpeakers(true);
    displayOrder = existing.length + 1;
  }
  const payload = {
    ...(speaker.id ? { id: speaker.id } : {}),
    name: speaker.name,
    position: speaker.position,
    organisation: speaker.organisation,
    bio: speaker.bio,
    photo_url: speaker.photo_url ?? null,
    session_title: speaker.session_title,
    session_time: speaker.session_time,
    session_date: speaker.session_date,
    display_order: displayOrder ?? 0,
    is_active: speaker.is_active ?? true,
  };
  const { data, error } = await db().from('speakers').upsert(payload).select().single();
  if (error || !data) return { data: null, error: error?.message || 'Failed to save speaker.' };
  return { data: data as Speaker, error: null };
}

export async function deleteSpeaker(id: string): Promise<{ error: string | null }> {
  if (!hasServerSupabase()) return { error: 'Server database is not configured.' };
  const { error } = await db().from('speakers').delete().eq('id', id);
  return { error: error?.message || null };
}

export async function hasVisitorVoted(visitorId: string): Promise<boolean> {
  if (!hasServerSupabase()) return false;
  const { data } = await db().from('speaker_votes').select('id').eq('visitor_id', visitorId).limit(1);
  return Boolean(data?.length);
}

export async function submitSpeakerVote(
  visitorId: string,
  speakerId: string
): Promise<{ success: boolean; message?: string }> {
  if (await hasVisitorVoted(visitorId)) {
    return { success: false, message: 'You have already cast your vote for the People Choice Award!' };
  }
  const { data: speaker } = await db().from('speakers').select('id, is_active').eq('id', speakerId).maybeSingle();
  if (!speaker?.id || speaker.is_active === false) {
    return { success: false, message: 'That speaker is not available for voting.' };
  }
  const { error } = await db().from('speaker_votes').insert({
    visitor_id: visitorId,
    speaker_id: speakerId,
    voting_event_id: VOTING_EVENT_ID,
  });
  if (error) {
    if (error.code === '23505') return { success: false, message: 'You have already cast your vote!' };
    console.error('submitSpeakerVote:', error.message);
    return { success: false, message: 'Could not record your vote. Check your connection and try again.' };
  }
  return { success: true };
}

// -------------------------------------------------------------
// ADMIN ANALYTICS
// -------------------------------------------------------------
export async function getAdminAnalytics() {
  const [checkpoints, speakers] = await Promise.all([listCheckpoints(true, false), listSpeakers(true)]);
  if (!hasServerSupabase()) {
    return {
      totalVisitors: 0,
      totalVisits: 0,
      avgOverallRating: '0.00',
      totalVotes: 0,
      rewardsUnlocked: 0,
      rewardsClaimed: 0,
      totalQuizCompletions: 0,
      totalQuizPoints: 0,
      boothAnalytics: [] as BoothAnalytics[],
      visits: [] as BoothVisit[],
      speakers,
      speakerVotes: [] as SpeakerVote[],
      visitorIdentities: [] as AdminAnalyticsVisitor[],
    };
  }

  const [visitsRes, votesRes, rewardsRes, visitorsRes] = await Promise.all([
    db().from('booth_visits').select('*'),
    db().from('speaker_votes').select('*'),
    db().from('visitor_rewards').select('*'),
    db().from('visitors').select('id, display_name, username, student_id, faculty').order('created_at', { ascending: false }),
  ]);
  const visits = (visitsRes.data || []) as BoothVisit[];
  const speakerVotes = (votesRes.data || []) as SpeakerVote[];
  const rewards = (rewardsRes.data || []) as VisitorReward[];
  const visitorIdentities = (visitorsRes.data || []) as AdminAnalyticsVisitor[];

  const boothAnalytics: BoothAnalytics[] = checkpoints
    .map(checkpoint => {
      const boothVisits = visits.filter(visit => visit.checkpoint_id === checkpoint.id);
      const count = boothVisits.length;
      const average = count > 0 ? boothVisits.reduce((sum, visit) => sum + visit.rating, 0) / count : 0;
      const quizCompletions = boothVisits.filter(visit => visit.quiz_completed_at).length;
      const quizPoints = boothVisits.reduce((sum, visit) => sum + (visit.quiz_points || 0), 0);
      return {
        id: checkpoint.id,
        name: checkpoint.name,
        faculty: checkpoint.faculty,
        category: checkpoint.category,
        booth_type: checkpoint.booth_type || 'required',
        total_visits: count,
        quiz_completions: quizCompletions,
        quiz_points: quizPoints,
        avg_rating: Number(average.toFixed(2)),
      };
    })
    .sort((a, b) => b.total_visits - a.total_visits || b.avg_rating - a.avg_rating);

  const activeVisitors = new Set(visits.map(visit => visit.visitor_id)).size;
  return {
    totalVisitors: visitorIdentities.length > 0 ? visitorIdentities.length : activeVisitors,
    totalVisits: visits.length,
    avgOverallRating:
      visits.length > 0 ? (visits.reduce((sum, visit) => sum + visit.rating, 0) / visits.length).toFixed(2) : '0.00',
    totalVotes: speakerVotes.length,
    rewardsUnlocked: rewards.length,
    rewardsClaimed: rewards.filter(reward => reward.status === 'claimed').length,
    totalQuizCompletions: boothAnalytics.reduce((sum, booth) => sum + booth.quiz_completions, 0),
    totalQuizPoints: boothAnalytics.reduce((sum, booth) => sum + booth.quiz_points, 0),
    boothAnalytics,
    visits,
    speakers,
    speakerVotes,
    visitorIdentities,
  };
}

export async function checkAdminWrite(): Promise<{ ok: boolean; message: string }> {
  if (!hasServerSupabase()) {
    return { ok: false, message: 'Server database is not configured.' };
  }
  const probeId = crypto.randomUUID();
  const { error: insertError } = await db().from('checkpoints').insert({
    id: probeId,
    name: 'Write probe (safe to ignore)',
    faculty: 'Diagnostic',
    category: 'Exhibition',
    description: 'Temporary diagnostic row.',
    location: 'Diagnostic',
    qr_token: `probe-${probeId}`,
    display_order: 9999,
  });
  if (insertError) return { ok: false, message: insertError.message };
  await db().from('checkpoints').delete().eq('id', probeId);
  return { ok: true, message: 'Admin write access confirmed.' };
}
