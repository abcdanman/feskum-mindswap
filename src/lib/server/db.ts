import 'server-only';
import crypto from 'node:crypto';
import webpush from 'web-push';
import {
  type AdminAnalyticsVisitor,
  type BoothAnalytics,
  type BoothVisit,
  type Checkpoint,
  type EvaluationReport,
  type LeaderboardDay,
  type LeaderboardEntry,
  type QuizQuestion,
  type RankingMetric,
  type RewardSetting,
  type Speaker,
  type SpeakerVote,
  type VisitorReward,
  type VotingStatus,
} from '@/lib/types';
import { INITIAL_CHECKPOINTS, INITIAL_REWARD_SETTING, INITIAL_SPEAKERS } from '@/lib/mockData';
import type { LayoutOverrides } from '@/lib/floorplan';
import { getLeaderboardScore, calculateQuizScore, QUIZ_MAX_QUESTIONS } from '@/lib/scoring';
import { getLeaderboardDayRange, EVENT_TIME_ZONE } from '@/lib/event';
import { validateUsername } from '@/lib/username';
import { getSupabaseAdmin, hasServerSupabase } from './supabaseAdmin';

const VOTING_EVENT_ID = '00000000-0000-0000-0000-000000000002';

function db() {
  return getSupabaseAdmin();
}

// -------------------------------------------------------------
// SHORT-LIVED IN-MEMORY CACHES
//
// These survive only for the life of a warm serverless instance, but during
// the event most concurrent scans/leaderboard polls land on the same warm
// instance, so a few seconds of sharing cuts the bulk of redundant reads.
// -------------------------------------------------------------
const LEADERBOARD_CACHE_MS = 8_000;
const CHECKPOINT_CACHE_MS = 15_000;
// If a claimed recompute never finishes writing back (e.g. the function was
// killed mid-flight), another instance can reclaim the job after this long
// rather than leaving the snapshot stuck stale forever.
const SNAPSHOT_CLAIM_TIMEOUT_MS = 15_000;

// Checkpoints are cheap to read and rarely change, so a per-instance cache
// is enough. The leaderboard query is expensive and gets hit by far more
// concurrent traffic, so it needs a cache shared across instances — see
// getRankingRows below, backed by the leaderboard_snapshots table.
const rankingRowsCache = new Map<LeaderboardDay, { expiresAt: number; rows: RawRankRow[] }>();
let checkpointCache: { expiresAt: number; byId: Map<string, Checkpoint> } | null = null;
let checkpointCacheInFlight: Promise<Checkpoint[]> | null = null;

// The public "active checkpoints" list is what every visitor-facing page
// fetches on mount (home, booths, passport, scan) — cache it separately
// from the by-id lookup above, which carries inactive booths too.
const activeCheckpointsCache = new Map<string, { expiresAt: number; data: Checkpoint[] }>();
const SPEAKERS_CACHE_MS = 15_000;
const speakersCache = new Map<string, { expiresAt: number; data: Speaker[] }>();
let votingStatusCache: { expiresAt: number; data: VotingStatus } | null = null;
let rewardSettingCache: { expiresAt: number; data: RewardSetting } | null = null;

function invalidateCheckpointCache() {
  checkpointCache = null;
  activeCheckpointsCache.clear();
}

function invalidateSpeakersCache() {
  speakersCache.clear();
}

async function getCheckpointCached(id: string): Promise<Checkpoint | null> {
  const now = Date.now();
  if (!checkpointCache || checkpointCache.expiresAt < now) {
    if (!checkpointCacheInFlight) {
      checkpointCacheInFlight = listCheckpoints(true, false).finally(() => {
        checkpointCacheInFlight = null;
      });
    }
    const all = await checkpointCacheInFlight;
    checkpointCache = { expiresAt: Date.now() + CHECKPOINT_CACHE_MS, byId: new Map(all.map(c => [c.id, c])) };
  }
  return checkpointCache.byId.get(id) || null;
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

  // The hot path — every visitor-facing page calls this with the same
  // (false, true) args on mount. Cache that exact response per warm
  // instance instead of round-tripping to Supabase on every tab switch.
  const cacheKey = `${includeInactive}:${publicView}`;
  if (!includeInactive) {
    const cached = activeCheckpointsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
  }

  let query = db().from('checkpoints').select('*').order('display_order', { ascending: true });
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error || !data) return [];
  const result = (publicView ? data.map(sanitizeCheckpoint) : data) as Checkpoint[];
  if (!includeInactive) {
    activeCheckpointsCache.set(cacheKey, { expiresAt: Date.now() + CHECKPOINT_CACHE_MS, data: result });
  }
  return result;
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
    map_label: checkpoint.map_label ?? null,
    map_color: checkpoint.map_color ?? null,
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
  invalidateCheckpointCache();
  return { data: data as Checkpoint, error: null };
}

export async function deleteCheckpoint(id: string): Promise<{ error: string | null }> {
  if (!hasServerSupabase()) return { error: 'Server database is not configured.' };
  const { error } = await db().from('checkpoints').delete().eq('id', id);
  if (!error) invalidateCheckpointCache();
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
  const checkpoint = await getCheckpointCached(checkpointId);
  if (!checkpoint || checkpoint.is_active === false) {
    return { success: false, message: 'This booth is not available.' };
  }

  // Single insert — duplicate stamps are rejected by unique_visitor_checkpoint
  // below rather than pre-checked with a read, so the happy path is one write.
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

// Paper-fallback reconciliation: when a booth was scanned on a paper tally
// form during an outage, staff re-enter it here afterwards so the stamp
// counts toward the leaderboard and reward threshold like a normal scan.
export async function manualGrantBoothVisit(
  visitorId: string,
  checkpointId: string,
  staffName: string
): Promise<{ success: boolean; visit?: BoothVisit; message?: string }> {
  if (!hasServerSupabase()) return { success: false, message: 'Server database is not configured.' };
  const checkpoint = await getCheckpointById(checkpointId);
  if (!checkpoint) return { success: false, message: 'Unknown booth.' };

  const note = `Paper fallback entry by ${staffName.slice(0, 80) || 'staff'}`;
  const { data, error } = await db()
    .from('booth_visits')
    .insert({
      visitor_id: visitorId,
      checkpoint_id: checkpointId,
      rating: 5,
      review: note,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'This visitor already has a stamp for that booth.' };
    }
    console.error('manualGrantBoothVisit:', error.message);
    return { success: false, message: 'Could not record the stamp. Try again.' };
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
  const checkpoint = await getCheckpointCached(checkpointId);
  const quizQuestions = (checkpoint?.quiz || []).slice(0, QUIZ_MAX_QUESTIONS);
  if (!checkpoint || checkpoint.is_active === false || !quizQuestions.length) {
    return { success: false, correct: 0, total: 0, points: 0, message: 'This booth has no quiz.' };
  }

  const safeAnswers = quizQuestions.map((question, index) => {
    const answer = answers[index];
    return typeof answer === 'number' && Number.isInteger(answer) && answer >= 0 && answer < question.options.length ? answer : null;
  });
  const score = calculateQuizScore(quizQuestions, safeAnswers);

  // Conditional update folds the "stamp collected, quiz not yet done" check
  // into the write itself — one round trip on the happy path instead of a
  // read to check state followed by a separate write.
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
    .is('quiz_completed_at', null)
    .select()
    .maybeSingle();

  if (error) {
    console.error('submitBoothQuiz:', error.message);
    return { success: false, ...score, message: 'Could not save your quiz. Check your connection and try again.' };
  }
  if (!data) {
    // Rare failure path only: distinguish "no stamp yet" from "already done"
    // with a single light read instead of paying for it on every submission.
    const { data: visit } = await db()
      .from('booth_visits')
      .select('quiz_completed_at')
      .eq('visitor_id', visitorId)
      .eq('checkpoint_id', checkpointId)
      .maybeSingle();
    const message = visit ? 'You already completed this quiz.' : 'Collect the stamp first.';
    return { success: false, correct: 0, total: quizQuestions.length, points: 0, message };
  }
  return { success: true, visit: data as BoothVisit, ...score };
}

// -------------------------------------------------------------
// FLOOR PLAN SETTINGS
// -------------------------------------------------------------
export async function getFloorplanHiddenPositions(): Promise<number[]> {
  if (!hasServerSupabase()) return [];
  const { data, error } = await db()
    .from('floorplan_settings')
    .select('hidden_positions')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return [];
  return (data.hidden_positions as number[]) || [];
}

export async function saveFloorplanHiddenPositions(positions: number[]): Promise<{ error: string | null }> {
  if (!hasServerSupabase()) return { error: 'Server database is not configured.' };
  const { error } = await db()
    .from('floorplan_settings')
    .upsert({ id: 1, hidden_positions: positions });
  return { error: error?.message || null };
}

export async function getFloorplanLayoutOverrides(): Promise<LayoutOverrides> {
  if (!hasServerSupabase()) return {};
  const { data, error } = await db()
    .from('floorplan_settings')
    .select('layout_overrides')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return {};
  return (data.layout_overrides as LayoutOverrides) || {};
}

export async function saveFloorplanLayoutOverrides(overrides: LayoutOverrides): Promise<{ error: string | null }> {
  if (!hasServerSupabase()) return { error: 'Server database is not configured.' };
  const { error } = await db()
    .from('floorplan_settings')
    .upsert({ id: 1, layout_overrides: overrides });
  return { error: error?.message || null };
}

export async function getFloorplanHiddenLandmarks(): Promise<string[]> {
  if (!hasServerSupabase()) return [];
  const { data, error } = await db()
    .from('floorplan_settings')
    .select('hidden_landmarks')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return [];
  return (data.hidden_landmarks as string[]) || [];
}

export async function saveFloorplanHiddenLandmarks(labels: string[]): Promise<{ error: string | null }> {
  if (!hasServerSupabase()) return { error: 'Server database is not configured.' };
  const { error } = await db()
    .from('floorplan_settings')
    .upsert({ id: 1, hidden_landmarks: labels });
  return { error: error?.message || null };
}

// -------------------------------------------------------------
// REWARDS
// -------------------------------------------------------------
export async function getRewardSetting(): Promise<RewardSetting> {
  if (!hasServerSupabase()) return INITIAL_REWARD_SETTING;
  if (rewardSettingCache && rewardSettingCache.expiresAt > Date.now()) return rewardSettingCache.data;
  const { data, error } = await db()
    .from('reward_settings')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  const result = error || !data ? INITIAL_REWARD_SETTING : ({ ranking_metric: 'points', ...data } as RewardSetting);
  rewardSettingCache = { expiresAt: Date.now() + SPEAKERS_CACHE_MS, data: result };
  return result;
}

export async function saveRewardSetting(setting: Partial<RewardSetting>): Promise<{ data: RewardSetting; error: string | null }> {
  const current = await getRewardSetting();
  const updated = { ...current, ...setting };
  if (!hasServerSupabase()) return { data: updated, error: 'Server database is not configured.' };
  const { error } = await db().from('reward_settings').upsert(updated);
  if (!error) rewardSettingCache = { expiresAt: Date.now() + SPEAKERS_CACHE_MS, data: updated };
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

export interface VisitorListEntry {
  id: string;
  display_name: string | null;
  username: string | null;
  student_id: string | null;
  faculty: string | null;
  show_on_leaderboard: boolean;
  created_at: string;
  stamp_count: number;
}

/** Every registered identity, for the admin's account-management view —
 * covers the "release this device" case: a visitor whose device/localStorage
 * is stuck can have their row deleted here and re-register from scratch. */
export async function listAllVisitors(): Promise<VisitorListEntry[]> {
  if (!hasServerSupabase()) return [];
  const [visitorsRes, visitsRes] = await Promise.all([
    db()
      .from('visitors')
      .select('id, display_name, username, student_id, faculty, show_on_leaderboard, created_at')
      .order('created_at', { ascending: false }),
    db().from('booth_visits').select('visitor_id'),
  ]);
  const visitors = (visitorsRes.data || []) as Omit<VisitorListEntry, 'stamp_count'>[];
  const counts = new Map<string, number>();
  ((visitsRes.data || []) as { visitor_id: string }[]).forEach(v => counts.set(v.visitor_id, (counts.get(v.visitor_id) || 0) + 1));
  return visitors.map(v => ({ ...v, stamp_count: counts.get(v.id) || 0 }));
}

/** Cascades to booth_visits/visitor_rewards/speaker_votes/push_subscriptions
 * (all ON DELETE CASCADE) — lets the visitor re-register as a fresh identity. */
export async function deleteVisitor(id: string): Promise<{ error: string | null }> {
  if (!hasServerSupabase()) return { error: 'Server database is not configured.' };
  const { error } = await db().from('visitors').delete().eq('id', id);
  if (error) return { error: error.message || 'Could not delete that visitor.' };
  return { error: null };
}

export async function updateVisitorProfile(
  id: string,
  fields: {
    display_name?: string;
    username?: string;
    student_id?: string | null;
    faculty?: string;
    show_on_leaderboard?: boolean;
  }
): Promise<{ error: string | null }> {
  if (!hasServerSupabase()) return { error: 'Server database is not configured.' };
  const payload: Record<string, unknown> = {};
  if (fields.display_name !== undefined) payload.display_name = fields.display_name.trim().slice(0, 80);
  if (fields.faculty !== undefined) payload.faculty = fields.faculty.trim().slice(0, 120);
  if (fields.student_id !== undefined) payload.student_id = fields.student_id ? fields.student_id.trim().slice(0, 40) : null;
  if (fields.show_on_leaderboard !== undefined) payload.show_on_leaderboard = fields.show_on_leaderboard;
  if (fields.username !== undefined) {
    const check = await validateUsername(fields.username);
    if (!check.ok) return { error: check.error };
    const owner = await usernameOwner(check.username, id);
    if (owner) return { error: 'That username is already taken.' };
    payload.username = check.username;
  }
  const { error } = await db().from('visitors').update(payload).eq('id', id);
  if (error) {
    if (error.code === '23505') return { error: 'That username is already taken.' };
    return { error: error.message || 'Could not update that visitor.' };
  }
  return { error: null };
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

// Attempts to become the one instance that recomputes this day's snapshot.
// The UPDATE's WHERE clause only matches a row nobody else has claimed
// recently, so under concurrent instances Postgres lets exactly one of them
// win — the losers get zero rows back and skip straight to serving the
// existing (possibly slightly stale) snapshot instead of recomputing.
async function claimSnapshotRecompute(day: LeaderboardDay): Promise<boolean> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - SNAPSHOT_CLAIM_TIMEOUT_MS).toISOString();
  const { data: claimed } = await db()
    .from('leaderboard_snapshots')
    .update({ computing_since: now.toISOString() })
    .eq('day', day)
    .or(`computing_since.is.null,computing_since.lt.${staleBefore}`)
    .select('day')
    .maybeSingle();
  if (claimed) return true;

  // Row may not exist yet for this day — the PK collision means only the
  // first insert for a given day wins, so it doubles as a claim.
  const { error: insertError } = await db()
    .from('leaderboard_snapshots')
    .insert({ day, rows: [], updated_at: new Date(0).toISOString(), computing_since: now.toISOString() });
  return !insertError;
}

// Precomputed, shared across every serverless instance. An in-memory cache
// (however carefully single-flighted) can't dedupe a concurrent burst that
// Vercel fans out across many isolated function instances — this table is
// the one place all of them can agree on "is there a fresh answer already?"
async function getRankingRows(day: LeaderboardDay = 'all'): Promise<RawRankRow[]> {
  if (!hasServerSupabase()) return [];

  const local = rankingRowsCache.get(day);
  if (local && local.expiresAt > Date.now()) return local.rows;

  const { data: snapshot } = await db()
    .from('leaderboard_snapshots')
    .select('rows, updated_at')
    .eq('day', day)
    .maybeSingle();
  const snapshotRows = (snapshot?.rows as RawRankRow[] | undefined) || [];
  const snapshotAge = snapshot ? Date.now() - new Date(snapshot.updated_at).getTime() : Infinity;

  if (snapshot && snapshotAge < LEADERBOARD_CACHE_MS) {
    rankingRowsCache.set(day, { expiresAt: Date.now() + LEADERBOARD_CACHE_MS, rows: snapshotRows });
    return snapshotRows;
  }

  const wonClaim = await claimSnapshotRecompute(day);
  if (!wonClaim) {
    // Someone else is already recomputing — serve what's there now rather
    // than pile onto the same expensive query, and recheck again shortly.
    rankingRowsCache.set(day, { expiresAt: Date.now() + 2_000, rows: snapshotRows });
    return snapshotRows;
  }

  const rows = await buildRankingRowsUncached(day);
  await db()
    .from('leaderboard_snapshots')
    .upsert({ day, rows, updated_at: new Date().toISOString(), computing_since: null });
  rankingRowsCache.set(day, { expiresAt: Date.now() + LEADERBOARD_CACHE_MS, rows });
  return rows;
}

async function buildRankingRowsUncached(day: LeaderboardDay = 'all'): Promise<RawRankRow[]> {
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
      // The unique-vote constraint is per visitor_id, not per student_id —
      // someone who votes from two unlinked devices before ever linking by
      // matric can legitimately hold two valid vote rows. Once merged here
      // by student_id, cap at 1 so that doesn't silently double the score.
      votes: Math.min(row.votes, 1),
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
  const rows = await getRankingRows(day);
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
  const rows = await getRankingRows(day);
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

  const cacheKey = String(includeInactive);
  if (!includeInactive) {
    const cached = speakersCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
  }

  let query = db().from('speakers').select('*').order('display_order', { ascending: true });
  if (!includeInactive) query = query.eq('is_active', true);
  const [{ data, error }, { data: votes }] = await Promise.all([
    query,
    db().from('speaker_votes').select('speaker_id'),
  ]);
  if (error || !data) return [];
  const counts = new Map<string, number>();
  (votes || []).forEach((vote: { speaker_id: string }) => {
    counts.set(vote.speaker_id, (counts.get(vote.speaker_id) || 0) + 1);
  });
  const result = (data as Speaker[]).map(speaker => ({ ...speaker, vote_count: counts.get(speaker.id) || 0 }));
  if (!includeInactive) {
    speakersCache.set(cacheKey, { expiresAt: Date.now() + SPEAKERS_CACHE_MS, data: result });
  }
  return result;
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
    name: speaker.name ?? '',
    position: speaker.position ?? '',
    organisation: speaker.organisation ?? '',
    bio: speaker.bio ?? '',
    photo_url: speaker.photo_url ?? null,
    session_title: speaker.session_title ?? '',
    session_time: speaker.session_time ?? '',
    session_date: speaker.session_date,
    display_order: displayOrder ?? 0,
    is_active: speaker.is_active ?? true,
    is_winner: speaker.is_winner ?? false,
  };
  const { data, error } = await db().from('speakers').upsert(payload).select().single();
  if (error || !data) return { data: null, error: error?.message || 'Failed to save speaker.' };
  invalidateSpeakersCache();
  return { data: data as Speaker, error: null };
}

export async function deleteSpeaker(id: string): Promise<{ error: string | null }> {
  if (!hasServerSupabase()) return { error: 'Server database is not configured.' };
  const { error } = await db().from('speakers').delete().eq('id', id);
  if (!error) invalidateSpeakersCache();
  return { error: error?.message || null };
}

export async function hasVisitorVoted(visitorId: string): Promise<boolean> {
  if (!hasServerSupabase()) return false;
  const { data } = await db().from('speaker_votes').select('id').eq('visitor_id', visitorId).limit(1);
  return Boolean(data?.length);
}

export async function getVotingStatus(): Promise<VotingStatus> {
  if (!hasServerSupabase()) return { is_active: false, title: "People's Choice Award", description: '' };
  if (votingStatusCache && votingStatusCache.expiresAt > Date.now()) return votingStatusCache.data;
  const { data } = await db()
    .from('voting_events')
    .select('is_active, title, description')
    .eq('id', VOTING_EVENT_ID)
    .maybeSingle();
  const result = !data
    ? { is_active: false, title: "People's Choice Award", description: '' }
    : { is_active: Boolean(data.is_active), title: data.title || "People's Choice Award", description: data.description || '' };
  votingStatusCache = { expiresAt: Date.now() + SPEAKERS_CACHE_MS, data: result };
  return result;
}

export async function setVotingActive(active: boolean): Promise<{ error: string | null }> {
  if (!hasServerSupabase()) return { error: 'Server database is not configured.' };
  const { error } = await db().from('voting_events').update({ is_active: active }).eq('id', VOTING_EVENT_ID);
  if (!error) votingStatusCache = null;
  return { error: error?.message || null };
}

export async function submitSpeakerVote(
  visitorId: string,
  speakerId: string
): Promise<{ success: boolean; message?: string }> {
  const status = await getVotingStatus();
  if (!status.is_active) {
    return { success: false, message: 'People’s Choice voting is not open yet.' };
  }
  if (await hasVisitorVoted(visitorId)) {
    return { success: false, message: 'You have already cast your vote for the People Choice Award!' };
  }
  const { data: speaker } = await db().from('speakers').select('id, is_active, is_winner').eq('id', speakerId).maybeSingle();
  if (!speaker?.id || speaker.is_active === false) {
    return { success: false, message: 'That speaker is not available for voting.' };
  }
  if (speaker.is_winner) {
    return { success: false, message: 'This speaker has already been selected as a top-3 winner and is not eligible for the People’s Choice vote.' };
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
  invalidateSpeakersCache();
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

// -------------------------------------------------------------
// EVALUATION REPORT — end-of-day read on whether the passport mechanic is
// actually working, so organisers can decide what to change before the
// next day opens, rather than guessing from the raw visit count alone.
// -------------------------------------------------------------
function hourBucket(timestamp: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: EVENT_TIME_ZONE,
    hour: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

export async function getEvaluationReport(day: LeaderboardDay = 'all'): Promise<EvaluationReport> {
  const empty: EvaluationReport = {
    day,
    generated_at: new Date().toISOString(),
    registered_visitors: 0,
    active_visitors: 0,
    avg_rating: 0,
    funnel: { zero_stamps: 0, partial_stamps: 0, completed: 0, threshold: 8 },
    booth_performance: [],
    rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    quiz: { eligible_visits: 0, attempted: 0, completion_rate: 0, avg_accuracy: 0 },
    voting: { votes: 0, participation_rate: 0 },
    hourly_traffic: [],
    reviews: [],
    recommendations: ['Server database is not configured.'],
  };
  if (!hasServerSupabase()) return empty;

  const range = getLeaderboardDayRange(day);
  const [checkpoints, setting, visitsRes, votesRes, visitorsRes] = await Promise.all([
    listCheckpoints(true, false),
    getRewardSetting(),
    db().from('booth_visits').select('*'),
    db().from('speaker_votes').select('*'),
    db().from('visitors').select('id'),
  ]);

  const checkpointMap = new Map(checkpoints.map(c => [c.id, c]));
  const allVisits = (visitsRes.data || []) as BoothVisit[];
  const allVotes = (votesRes.data || []) as SpeakerVote[];
  const registeredVisitors = (visitorsRes.data || []).length;

  const visits = allVisits.filter(v => isWithinRange(v.visited_at, range));
  const votes = allVotes.filter(v => isWithinRange(v.created_at, range));

  // Funnel: of visitors active in this window, how many actually reach the
  // souvenir threshold vs stall out partway.
  const requiredStampsByVisitor = new Map<string, number>();
  const activeVisitorIds = new Set<string>();
  visits.forEach(visit => {
    activeVisitorIds.add(visit.visitor_id);
    const checkpoint = checkpointMap.get(visit.checkpoint_id);
    if ((checkpoint?.booth_type ?? 'required') !== 'partner') {
      requiredStampsByVisitor.set(visit.visitor_id, (requiredStampsByVisitor.get(visit.visitor_id) || 0) + 1);
    } else if (!requiredStampsByVisitor.has(visit.visitor_id)) {
      requiredStampsByVisitor.set(visit.visitor_id, 0);
    }
  });
  const threshold = setting.stamp_threshold || 8;
  let zeroStamps = 0;
  let partialStamps = 0;
  let completed = 0;
  requiredStampsByVisitor.forEach(count => {
    if (count <= 0) zeroStamps += 1;
    else if (count >= threshold) completed += 1;
    else partialStamps += 1;
  });

  // Per-booth performance within this window.
  const boothPerformance = checkpoints
    .map(checkpoint => {
      const boothVisits = visits.filter(v => v.checkpoint_id === checkpoint.id);
      const count = boothVisits.length;
      const avgRating = count > 0 ? boothVisits.reduce((sum, v) => sum + v.rating, 0) / count : 0;
      const quizEligible = checkpoint.booth_type === 'partner' && (checkpoint.quiz?.length || 0) > 0;
      const quizAttempts = boothVisits.filter(v => v.quiz_completed_at).length;
      return {
        id: checkpoint.id,
        name: checkpoint.name,
        faculty: checkpoint.faculty,
        booth_type: checkpoint.booth_type || 'required',
        visits: count,
        avg_rating: Number(avgRating.toFixed(2)),
        quiz_attempts: quizAttempts,
        quiz_eligible: quizEligible,
      };
    })
    .filter(b => b.visits > 0 || day === 'all')
    .sort((a, b) => b.visits - a.visits);

  // Rating distribution — now a meaningful signal since a rating requires
  // an explicit tap rather than defaulting to 5 stars.
  const ratingDistribution: EvaluationReport['rating_distribution'] = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  visits.forEach(v => {
    const key = String(Math.min(5, Math.max(1, Math.round(v.rating)))) as keyof typeof ratingDistribution;
    ratingDistribution[key] += 1;
  });

  // Quiz engagement among visits where a quiz was actually available.
  const quizEligibleVisits = visits.filter(v => {
    const checkpoint = checkpointMap.get(v.checkpoint_id);
    return checkpoint?.booth_type === 'partner' && (checkpoint.quiz?.length || 0) > 0;
  });
  const quizAttempted = quizEligibleVisits.filter(v => v.quiz_completed_at);
  const avgAccuracy =
    quizAttempted.length > 0
      ? quizAttempted.reduce((sum, v) => sum + (v.quiz_total ? (v.quiz_correct || 0) / v.quiz_total : 0), 0) /
        quizAttempted.length
      : 0;

  // Hourly traffic (KL local time) — surfaces peak/lull windows.
  const hourCounts = new Map<string, number>();
  visits.forEach(v => {
    const hour = hourBucket(v.visited_at);
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });
  const hourlyTraffic = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({ hour, visits: count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // Written reviews, newest first, for organisers to actually read.
  const reviews = visits
    .filter(v => v.review && v.review.trim())
    .sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime())
    .slice(0, 50)
    .map(v => ({
      booth_name: checkpointMap.get(v.checkpoint_id)?.name || 'Unknown booth',
      rating: v.rating,
      review: v.review || '',
      visited_at: v.visited_at,
    }));

  const activeVisitors = activeVisitorIds.size;
  const quizCompletionRate = quizEligibleVisits.length > 0 ? quizAttempted.length / quizEligibleVisits.length : 0;
  const votingRate = activeVisitors > 0 ? votes.length / activeVisitors : 0;
  const avgRatingOverall = visits.length > 0 ? visits.reduce((sum, v) => sum + v.rating, 0) / visits.length : 0;

  // Simple rule-based flags, not a model — just thresholds an organiser
  // would otherwise have to eyeball out of raw numbers themselves.
  const recommendations: string[] = [];
  if (registeredVisitors > 0 && activeVisitors / registeredVisitors < 0.5) {
    recommendations.push(
      `Only ${Math.round((activeVisitors / registeredVisitors) * 100)}% of registered visitors have scanned a single booth — remind staff at registration/entrance to walk people through their first scan.`
    );
  }
  if (activeVisitors > 0 && completed / activeVisitors < 0.3) {
    recommendations.push(
      `Only ${Math.round((completed / activeVisitors) * 100)}% of active visitors reached all ${threshold} required stamps — consider whether the threshold, hours, or booth spacing is realistic for one day.`
    );
  }
  const sampledBooths = boothPerformance.filter(b => b.visits > 0);
  if (sampledBooths.length > 2) {
    const medianVisits = [...sampledBooths].sort((a, b) => a.visits - b.visits)[Math.floor(sampledBooths.length / 2)].visits;
    const underperforming = sampledBooths.filter(b => b.visits < medianVisits * 0.4);
    underperforming.forEach(b => {
      recommendations.push(`"${b.name}" has well below median footfall (${b.visits} visits) — consider relocating it closer to the main path or giving it extra signage tomorrow.`);
    });
    const lowRated = sampledBooths.filter(b => b.visits >= 3 && b.avg_rating > 0 && b.avg_rating < 3.5);
    lowRated.forEach(b => {
      recommendations.push(`"${b.name}" is rated ${b.avg_rating}/5 across ${b.visits} visits — worth checking in with that booth before day 2.`);
    });
  }
  if (quizEligibleVisits.length >= 5 && quizCompletionRate < 0.4) {
    recommendations.push(
      `Only ${Math.round(quizCompletionRate * 100)}% of partner-booth visitors attempted the bonus quiz — remind staff to mention it when they hand out the stamp.`
    );
  }
  if (activeVisitors >= 10 && votingRate < 0.3) {
    recommendations.push(
      `Only ${Math.round(votingRate * 100)}% of active visitors cast a People's Choice vote — prompt voting more near the UM Talk stage and helpdesk.`
    );
  }
  if (visits.length >= 10 && ratingDistribution['5'] / visits.length > 0.85) {
    recommendations.push(
      `${Math.round((ratingDistribution['5'] / visits.length) * 100)}% of ratings are a perfect 5 stars — double-check this reflects real enthusiasm and not visitors rushing through the rating step.`
    );
  }
  if (hourlyTraffic.length >= 3) {
    const quietest = [...hourlyTraffic].sort((a, b) => a.visits - b.visits)[0];
    recommendations.push(`Quietest hour was ${quietest.hour}:00 (${quietest.visits} visits) — a good slot to schedule a pull-in activity or announcement tomorrow.`);
  }
  if (recommendations.length === 0 && visits.length > 0) {
    recommendations.push('No red flags from the numbers — the passport mechanic looks like it is working as intended.');
  }
  if (visits.length === 0) {
    recommendations.push('No booth visits recorded yet for this window.');
  }

  return {
    day,
    generated_at: new Date().toISOString(),
    registered_visitors: registeredVisitors,
    active_visitors: activeVisitors,
    avg_rating: Number(avgRatingOverall.toFixed(2)),
    funnel: { zero_stamps: zeroStamps, partial_stamps: partialStamps, completed, threshold },
    booth_performance: boothPerformance,
    rating_distribution: ratingDistribution,
    quiz: {
      eligible_visits: quizEligibleVisits.length,
      attempted: quizAttempted.length,
      completion_rate: Number(quizCompletionRate.toFixed(2)),
      avg_accuracy: Number(avgAccuracy.toFixed(2)),
    },
    voting: { votes: votes.length, participation_rate: Number(votingRate.toFixed(2)) },
    hourly_traffic: hourlyTraffic,
    reviews,
    recommendations,
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

// -------------------------------------------------------------
// WEB PUSH
// -------------------------------------------------------------
let vapidConfigured = false;
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function savePushSubscription(visitorId: string, sub: PushSubscriptionInput): Promise<{ error: string | null }> {
  if (!hasServerSupabase()) return { error: 'Server database is not configured.' };
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { error: 'Invalid subscription.' };
  const { error } = await db()
    .from('push_subscriptions')
    .upsert({ visitor_id: visitorId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: 'endpoint' });
  return { error: error?.message || null };
}

export async function deletePushSubscription(endpoint: string): Promise<{ error: string | null }> {
  if (!hasServerSupabase()) return { error: 'Server database is not configured.' };
  const { error } = await db().from('push_subscriptions').delete().eq('endpoint', endpoint);
  return { error: error?.message || null };
}

export async function broadcastPush(
  title: string,
  body: string,
  url?: string
): Promise<{ sent: number; failed: number; error: string | null }> {
  if (!hasServerSupabase()) return { sent: 0, failed: 0, error: 'Server database is not configured.' };
  if (!ensureVapid()) return { sent: 0, failed: 0, error: 'Push notifications are not configured (missing VAPID keys).' };
  if (!title.trim()) return { sent: 0, failed: 0, error: 'Title is required.' };

  const { data, error } = await db().from('push_subscriptions').select('id, endpoint, p256dh, auth');
  if (error) return { sent: 0, failed: 0, error: error.message };
  const subs = (data || []) as { id: string; endpoint: string; p256dh: string; auth: string }[];
  const payload = JSON.stringify({ title, body, url: url || '/' });

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];
  await Promise.all(
    subs.map(async sub => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        sent++;
      } catch (err) {
        failed++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) staleIds.push(sub.id);
      }
    })
  );
  if (staleIds.length) await db().from('push_subscriptions').delete().in('id', staleIds);
  return { sent, failed, error: null };
}
