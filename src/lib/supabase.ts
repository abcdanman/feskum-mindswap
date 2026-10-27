import { createClient } from '@supabase/supabase-js';
import {
  Checkpoint,
  BoothVisit,
  Speaker,
  RewardSetting,
  VisitorReward,
  SpeakerVote,
  BoothAnalytics,
  RankingMetric,
  LeaderboardEntry,
  LeaderboardDay,
  QuizQuestion,
  AdminAnalyticsVisitor,
} from './types';
import { INITIAL_CHECKPOINTS, INITIAL_SPEAKERS, INITIAL_REWARD_SETTING } from './mockData';
import { maskName } from './visitor';
import { getLeaderboardScore, calculateQuizScore, isPartnerTrailComplete, QUIZ_MAX_QUESTIONS } from './scoring';
import { getLeaderboardDayRange } from './event';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local fallback keys for client-side storage when Supabase env vars are not set
const STORAGE_KEYS = {
  CHECKPOINTS: 'ms_checkpoints_v1',
  VISITS: 'ms_visits_v1',
  SPEAKERS: 'ms_speakers_v1',
  VOTES: 'ms_votes_v1',
  REWARDS: 'ms_rewards_v1',
  REWARD_SETTINGS: 'ms_reward_settings_v1',
};

function getLocalData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('LocalStorage write error:', err);
  }
}

// -------------------------------------------------------------
// CHECKPOINTS API
// -------------------------------------------------------------
export async function getCheckpoints(includeInactive = false): Promise<Checkpoint[]> {
  if (supabase) {
    let query = supabase.from('checkpoints').select('*').order('display_order', { ascending: true });
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (!error && data) return data;
  }
  const local = getLocalData<Checkpoint[]>(STORAGE_KEYS.CHECKPOINTS, INITIAL_CHECKPOINTS);
  return includeInactive ? local : local.filter(c => c.is_active !== false);
}

export async function getCheckpointByQrToken(qrToken: string): Promise<Checkpoint | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('qr_token', qrToken)
      .single();
    if (!error && data) return data.is_active === false ? null : data;
  }
  const checkpoints = await getCheckpoints();
  return checkpoints.find(c => c.qr_token === qrToken || c.id === qrToken) || null;
}

export async function saveCheckpoint(
  checkpoint: Partial<Checkpoint>
): Promise<{ data: Checkpoint | null; error: string | null }> {
  if (supabase) {
    if (!checkpoint.id) {
      const existing = await getCheckpoints(true);
      checkpoint = {
        ...checkpoint,
        display_order: checkpoint.display_order ?? existing.length + 1,
      };
    }
    const payload = {
      ...checkpoint,
      booth_type: checkpoint.booth_type ?? 'required',
      quiz: checkpoint.quiz ?? [],
    };
    const { data, error } = await supabase.from('checkpoints').upsert(payload).select().single();
    if (!error && data) return { data, error: null };
    return { data: null, error: error?.message || 'Failed to save booth.' };
  }

  const checkpoints = await getCheckpoints(true);
  let updated: Checkpoint[];
  let target: Checkpoint;
  if (checkpoint.id) {
    target = { ...checkpoints.find(c => c.id === checkpoint.id)!, ...checkpoint } as Checkpoint;
    updated = checkpoints.map(c => (c.id === checkpoint.id ? target : c));
  } else {
    target = {
      id: 'booth-' + Date.now(),
      name: checkpoint.name || 'New Booth',
      faculty: checkpoint.faculty || 'Faculty',
      category: checkpoint.category || 'Exhibition',
      description: checkpoint.description || '',
      location: checkpoint.location || 'Marquee Tent, High Impact Research Building',
      image_url: checkpoint.image_url || null,
      qr_token: checkpoint.qr_token || 'qr-' + Date.now(),
      is_active: checkpoint.is_active ?? true,
      display_order: checkpoints.length + 1,
      booth_type: checkpoint.booth_type || 'required',
      quiz: checkpoint.quiz || [],
    };
    updated = [...checkpoints, target];
  }
  setLocalData(STORAGE_KEYS.CHECKPOINTS, updated);
  return { data: target, error: null };
}

export async function deleteCheckpoint(id: string): Promise<{ error: string | null }> {
  if (supabase) {
    const { error } = await supabase.from('checkpoints').delete().eq('id', id);
    if (error) return { error: error.message };
  }
  const checkpoints = await getCheckpoints(true);
  setLocalData(STORAGE_KEYS.CHECKPOINTS, checkpoints.filter(c => c.id !== id));
  return { error: null };
}

// -------------------------------------------------------------
// BOOTH VISITS & RATING STAMP API
// -------------------------------------------------------------
export async function getVisitorVisits(visitorId: string): Promise<BoothVisit[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('booth_visits')
      .select('*, checkpoint:checkpoints(*)')
      .eq('visitor_id', visitorId);
    if (!error && data) return data;
  }
  const allVisits = getLocalData<BoothVisit[]>(STORAGE_KEYS.VISITS, []);
  const checkpoints = await getCheckpoints();
  return allVisits
    .filter(v => v.visitor_id === visitorId)
    .map(v => ({
      ...v,
      checkpoint: checkpoints.find(c => c.id === v.checkpoint_id)
    }));
}

export async function submitBoothRating(
  visitorId: string,
  checkpointId: string,
  rating: number,
  review?: string
): Promise<{ success: boolean; visit?: BoothVisit; message?: string }> {
  // Check if already visited
  const existingVisits = await getVisitorVisits(visitorId);
  const alreadyVisited = existingVisits.some(v => v.checkpoint_id === checkpointId);
  if (alreadyVisited) {
    return { success: false, message: "You've already collected this stamp!" };
  }

  const newVisit: BoothVisit = {
    id: 'visit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    visitor_id: visitorId,
    checkpoint_id: checkpointId,
    rating,
    review: review?.trim() || null,
    visited_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('booth_visits')
      .insert({
        visitor_id: visitorId,
        checkpoint_id: checkpointId,
        rating,
        review: review?.trim() || null
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return { success: false, message: "You've already collected this stamp!" };
      }
      console.error('Supabase visit error:', error);
      return { success: false, message: 'Could not save your stamp. Check your connection and try again.' };
    }
    if (data) return { success: true, visit: data };
    return { success: false, message: 'Could not save your stamp. Please try again.' };
  }

  // Fallback to local storage only when Supabase is not configured
  const allVisits = getLocalData<BoothVisit[]>(STORAGE_KEYS.VISITS, []);
  allVisits.push(newVisit);
  setLocalData(STORAGE_KEYS.VISITS, allVisits);
  return { success: true, visit: newVisit };
}

export async function submitBoothQuiz(
  visitorId: string,
  checkpointId: string,
  questions: QuizQuestion[],
  answers: Array<number | null>
): Promise<{
  success: boolean;
  visit?: BoothVisit;
  correct: number;
  total: number;
  points: number;
  message?: string;
}> {
  const quizQuestions = questions.slice(0, QUIZ_MAX_QUESTIONS);
  if (!quizQuestions.length) {
    return { success: false, correct: 0, total: 0, points: 0, message: 'This booth has no quiz.' };
  }

  const visits = await getVisitorVisits(visitorId);
  const existing = visits.find(v => v.checkpoint_id === checkpointId);
  if (!existing) {
    return { success: false, correct: 0, total: quizQuestions.length, points: 0, message: 'Collect the stamp first.' };
  }
  if (existing.quiz_completed_at) {
    return { success: false, correct: 0, total: quizQuestions.length, points: 0, message: 'You already completed this quiz.' };
  }

  const score = calculateQuizScore(quizQuestions, answers);
  const completedAt = new Date().toISOString();

  if (supabase) {
    const { data, error } = await supabase
      .from('booth_visits')
      .update({
        quiz_correct: score.correct,
        quiz_total: score.total,
        quiz_points: score.points,
        quiz_completed_at: completedAt,
      })
      .eq('visitor_id', visitorId)
      .eq('checkpoint_id', checkpointId)
      .select()
      .single();
    if (error) {
      console.error('Supabase quiz error:', error);
      return { success: false, ...score, message: 'Could not save your quiz. Check your connection and try again.' };
    }
    if (data) return { success: true, visit: data, ...score };
    return { success: false, ...score, message: 'Could not save your quiz. Please try again.' };
  }

  const allVisits = getLocalData<BoothVisit[]>(STORAGE_KEYS.VISITS, []);
  const index = allVisits.findIndex(v => v.visitor_id === visitorId && v.checkpoint_id === checkpointId);
  if (index === -1) {
    return { success: false, ...score, message: 'Collect the stamp first.' };
  }
  allVisits[index] = {
    ...allVisits[index],
    quiz_correct: score.correct,
    quiz_total: score.total,
    quiz_points: score.points,
    quiz_completed_at: completedAt,
  };
  setLocalData(STORAGE_KEYS.VISITS, allVisits);
  return { success: true, visit: allVisits[index], ...score };
}

// -------------------------------------------------------------
// REWARD SYSTEM API
// -------------------------------------------------------------
export async function getRewardSetting(): Promise<RewardSetting> {
  if (supabase) {
    const { data, error } = await supabase.from('reward_settings').select('*').limit(1).single();
    if (!error && data) return { ranking_metric: 'points', ...data };
  }
  return getLocalData<RewardSetting>(STORAGE_KEYS.REWARD_SETTINGS, INITIAL_REWARD_SETTING);
}

export async function saveRewardSetting(setting: Partial<RewardSetting>): Promise<{ data: RewardSetting; error: string | null }> {
  const current = await getRewardSetting();
  const updated = { ...current, ...setting };
  if (supabase) {
    const { error } = await supabase.from('reward_settings').upsert(updated);
    if (error) return { data: updated, error: error.message };
  }
  setLocalData(STORAGE_KEYS.REWARD_SETTINGS, updated);
  return { data: updated, error: null };
}

export async function getVisitorRewardStatus(visitorId: string): Promise<VisitorReward | null> {
  if (supabase) {
    const { data, error } = await supabase.from('visitor_rewards').select('*').eq('visitor_id', visitorId).single();
    if (!error && data) return data;
  }
  const rewards = getLocalData<VisitorReward[]>(STORAGE_KEYS.REWARDS, []);
  return rewards.find(r => r.visitor_id === visitorId) || null;
}

export async function unlockVisitorReward(visitorId: string): Promise<VisitorReward> {
  const setting = await getRewardSetting();
  const existing = await getVisitorRewardStatus(visitorId);
  if (existing) return existing;

  const newReward: VisitorReward = {
    id: 'reward-' + Date.now(),
    visitor_id: visitorId,
    reward_id: setting.id,
    status: 'unlocked',
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data } = await supabase.from('visitor_rewards').insert({
      visitor_id: visitorId,
      reward_id: setting.id,
      status: 'unlocked'
    }).select().single();
    if (data) return data;
  }

  const rewards = getLocalData<VisitorReward[]>(STORAGE_KEYS.REWARDS, []);
  rewards.push(newReward);
  setLocalData(STORAGE_KEYS.REWARDS, rewards);
  return newReward;
}

export async function claimVisitorReward(visitorId: string, staffName: string = 'Staff Helpdesk'): Promise<VisitorReward | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('visitor_rewards')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        claimed_by_staff: staffName
      })
      .eq('visitor_id', visitorId)
      .select()
      .single();
    if (!error && data) return data;
  }

  const rewards = getLocalData<VisitorReward[]>(STORAGE_KEYS.REWARDS, []);
  const index = rewards.findIndex(r => r.visitor_id === visitorId);
  if (index !== -1) {
    rewards[index].status = 'claimed';
    rewards[index].claimed_at = new Date().toISOString();
    rewards[index].claimed_by_staff = staffName;
    setLocalData(STORAGE_KEYS.REWARDS, rewards);
    return rewards[index];
  }
  return null;
}

// -------------------------------------------------------------
// VISITOR IDENTITY & IMAGE UPLOAD
// -------------------------------------------------------------
export async function registerVisitorIdentity(
  visitorId: string,
  identity: { name: string; username: string; matric: string; faculty: string; showOnLeaderboard: boolean }
): Promise<{ visitorId: string; reclaimed: boolean; error: string | null }> {
  if (!supabase) return { visitorId, reclaimed: false, error: null };

  const username = identity.username.trim().toLowerCase();
  const payload = {
    display_name: identity.name.trim(),
    username,
    student_id: identity.matric.trim() || null,
    faculty: identity.faculty.trim() || null,
    show_on_leaderboard: identity.showOnLeaderboard,
  };

  const findOwner = async (excludeId?: string) => {
    const { data } = await supabase
      .from('visitors')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (data?.id && data.id !== excludeId) return data.id;
    return null;
  };

  // If this matric already exists, reuse that identity so a returning attendee
  // keeps their stamps/rank even on a new device.
  if (payload.student_id) {
    const { data: existing } = await supabase
      .from('visitors')
      .select('id')
      .eq('student_id', payload.student_id)
      .maybeSingle();
    if (existing?.id) {
      const ownerId = await findOwner(existing.id);
      if (ownerId) {
        return { visitorId: existing.id, reclaimed: true, error: 'That username is already taken. Please choose another.' };
      }
      const { error } = await supabase.from('visitors').update(payload).eq('id', existing.id);
      if (error) {
        console.error('registerVisitorIdentity reclaim error:', error.message);
        return { visitorId: existing.id, reclaimed: true, error: 'Could not save your profile. Check your connection and try again.' };
      }
      return { visitorId: existing.id, reclaimed: true, error: null };
    }
  }

  const ownerId = await findOwner(visitorId);
  if (ownerId) {
    return { visitorId, reclaimed: false, error: 'That username is already taken. Please choose another.' };
  }

  const { error } = await supabase.from('visitors').upsert({ id: visitorId, ...payload });
  if (error) {
    console.error('registerVisitorIdentity error:', error.message);
    if (error.code === '23505') {
      return { visitorId, reclaimed: false, error: 'That username is already taken. Please choose another.' };
    }
    return { visitorId, reclaimed: false, error: 'Could not save your profile. Check your connection and try again.' };
  }
  return { visitorId, reclaimed: false, error: null };
}

export async function isUsernameAvailable(
  username: string,
  visitorId?: string
): Promise<{ available: boolean; error?: string }> {
  if (!supabase) return { available: true };
  const { data, error } = await supabase
    .from('visitors')
    .select('id')
    .eq('username', username.trim().toLowerCase())
    .maybeSingle();
  if (error) {
    console.error('isUsernameAvailable error:', error.message);
    return { available: false, error: 'Could not check that username. Try again.' };
  }
  if (!data?.id || data.id === visitorId) return { available: true };
  return { available: false };
}

export async function findVisitorByUsername(
  username: string
): Promise<AdminAnalyticsVisitor | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('visitors')
    .select('id, display_name, username, student_id, faculty')
    .eq('username', username.trim().replace(/^@+/, '').toLowerCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as AdminAnalyticsVisitor;
}

export async function uploadImage(file: File, folder = 'booths'): Promise<string | null> {
  if (!supabase) return null;
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('booth-images').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    console.error('uploadImage error:', error.message);
    return null;
  }
  const { data } = supabase.storage.from('booth-images').getPublicUrl(path);
  return data.publicUrl;
}

// -------------------------------------------------------------
// LEADERBOARD & RANKING
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
  if (!supabase) return [];

  const [visitsRes, votesRes, visitorsRes, checkpointsRes] = await Promise.all([
    supabase.from('booth_visits').select('visitor_id, checkpoint_id, rating, visited_at, quiz_points'),
    supabase.from('speaker_votes').select('visitor_id, created_at'),
    supabase.from('visitors').select('id, display_name, username, show_on_leaderboard, student_id'),
    supabase.from('checkpoints').select('id, booth_type, is_active'),
  ]);

  const visits = (visitsRes.data || []) as VisitRow[];
  const votes = (votesRes.data || []) as VoteRow[];
  const visitors = (visitorsRes.data || []) as VisitorRow[];
  let checkpoints = (checkpointsRes.data || []) as { id: string; booth_type?: string | null; is_active?: boolean | null }[];
  if (checkpointsRes.error) {
    const { data } = await supabase.from('checkpoints').select('id, is_active');
    checkpoints = (data || []).map(c => ({ ...c, booth_type: 'required' }));
  }

  if (!visits.length && !votes.length) return [];

  const boothTypeById = new Map(
    checkpoints.map(c => [c.id, c.booth_type === 'partner' ? 'partner' : 'required'] as const)
  );
  const partnerIds = new Set(
    checkpoints.filter(c => c.is_active !== false && c.booth_type === 'partner').map(c => c.id)
  );
  const typeOf = (checkpointId: string) => boothTypeById.get(checkpointId) || 'required';
  const range = getLeaderboardDayRange(day);

  const visitorMap = new Map(visitors.map(v => [v.id, v]));

  // Group by visitor_id, then merge rows that share the same student_id so the
  // same person on two devices is ranked together.
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
    const v = visitorMap.get(visitorId);
    return v?.student_id ? `sid:${v.student_id}` : `vid:${visitorId}`;
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

  // Partner trail completion is all-time; the bonus is attributed to the day
  // the final partner booth was visited.
  const partnerVisitsByKey = new Map<string, { checkpointIds: Set<string>; latest: string }>();
  visits.forEach(v => {
    if (typeOf(v.checkpoint_id) !== 'partner') return;
    const key = keyFor(v.visitor_id);
    let trail = partnerVisitsByKey.get(key);
    if (!trail) {
      trail = { checkpointIds: new Set(), latest: v.visited_at };
      partnerVisitsByKey.set(key, trail);
    }
    trail.checkpointIds.add(v.checkpoint_id);
    if (new Date(v.visited_at).getTime() > new Date(trail.latest).getTime()) {
      trail.latest = v.visited_at;
    }
  });

  visits
    .filter(v => isWithinRange(v.visited_at, range))
    .forEach(v => {
      const row = ensure(keyFor(v.visitor_id), v.visitor_id);
      const type = typeOf(v.checkpoint_id);
      if (type === 'partner') {
        if (!row.partnerStamps.has(v.checkpoint_id)) {
          row.partnerStamps.add(v.checkpoint_id);
          row.rating_sum += v.rating || 0;
        }
      } else if (!row.requiredStamps.has(v.checkpoint_id)) {
        row.requiredStamps.add(v.checkpoint_id);
        row.rating_sum += v.rating || 0;
      }
      row.quiz_points += v.quiz_points || 0;
    });

  votes
    .filter(v => isWithinRange(v.created_at, range))
    .forEach(v => {
      ensure(keyFor(v.visitor_id), v.visitor_id).votes += 1;
    });

  const rows: RawRankRow[] = [];
  byVisitor.forEach((row, key) => {
    const groupVisitors = [...row.visitor_ids]
      .map(id => visitorMap.get(id))
      .filter((v): v is VisitorRow => Boolean(v));
    const showOk = groupVisitors.length > 0 && groupVisitors.every(v => v.show_on_leaderboard !== false);
    const rawName = groupVisitors.find(v => v.display_name)?.display_name || 'Visitor';
    const username = groupVisitors.find(v => v.username)?.username || null;
    const trail = partnerVisitsByKey.get(key);
    const partnerTrailComplete =
      partnerIds.size > 0 &&
      Boolean(trail) &&
      [...partnerIds].every(id => trail!.checkpointIds.has(id));

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
    const trailBonus =
      row.partner_trail_complete && isWithinRange(row.partner_completion_at, range)
        ? 1
        : 0;
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
  const avg = (r: RawRankRow) => {
    const totalStamps = r.required_stamps + r.partner_stamps;
    return totalStamps > 0 ? r.rating_sum / totalStamps : 0;
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
  myVisitorId?: string
): LeaderboardEntry {
  const totalStamps = row.required_stamps + row.partner_stamps;
  return {
    rank,
    visitor_id: row.visitor_id,
    name: row.name ? (row.username || maskName(row.name)) : 'Anonymous',
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
  myVisitorId?: string,
  day: LeaderboardDay = 'all'
): Promise<LeaderboardEntry[]> {
  const rows = await buildRankingRows(day);
  return rows
    .filter(r => r.required_stamps + r.partner_stamps > 0)
    .sort((a, b) => compareRows(a, b, metric, day))
    .slice(0, limit)
    .map((r, i) => toEntry(r, i + 1, metric, day, myVisitorId));
}

export async function getVisitorRank(
  visitorId: string,
  metric: RankingMetric = 'points',
  day: LeaderboardDay = 'all'
): Promise<{ rank: number; total: number; entry: LeaderboardEntry | null }> {
  const rows = await buildRankingRows(day);
  const sorted = rows
    .filter(r => r.required_stamps + r.partner_stamps > 0)
    .sort((a, b) => compareRows(a, b, metric, day));

  const idx = sorted.findIndex(r => r.visitor_ids.includes(visitorId));
  if (idx === -1) return { rank: 0, total: sorted.length, entry: null };
  return {
    rank: idx + 1,
    total: sorted.length,
    entry: toEntry(sorted[idx], idx + 1, metric, day, visitorId),
  };
}

// -------------------------------------------------------------
// SPEAKERS & PEOPLE'S CHOICE VOTING API
// -------------------------------------------------------------
export async function getSpeakers(): Promise<Speaker[]> {
  if (supabase) {
    const { data, error } = await supabase.from('speakers').select('*').order('display_order', { ascending: true });
    if (!error && data && data.length > 0) {
      // Aggregate live vote tallies from the speaker_votes table
      const { data: votes } = await supabase.from('speaker_votes').select('speaker_id');
      if (votes) {
        const counts = new Map<string, number>();
        votes.forEach((v: { speaker_id: string }) => counts.set(v.speaker_id, (counts.get(v.speaker_id) || 0) + 1));
        return data.map((s: Speaker) => ({ ...s, vote_count: counts.get(s.id) || 0 }));
      }
      return data;
    }
  }
  const local = getLocalData<Speaker[]>(STORAGE_KEYS.SPEAKERS, INITIAL_SPEAKERS);
  return local.map(s => ({ ...s, vote_count: s.vote_count || 0 }));
}

export async function saveSpeaker(speaker: Partial<Speaker>): Promise<{ data: Speaker | null; error: string | null }> {
  if (supabase) {
    let displayOrder = speaker.display_order;
    if (!speaker.id && displayOrder == null) {
      const existing = await getSpeakers();
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
    const { data, error } = await supabase.from('speakers').upsert(payload).select().single();
    if (!error && data) return { data, error: null };
    return { data: null, error: error?.message || 'Failed to save speaker.' };
  }
  const speakers = await getSpeakers();
  let updated: Speaker[];
  let target: Speaker;
  if (speaker.id) {
    target = { ...speakers.find(s => s.id === speaker.id)!, ...speaker } as Speaker;
    updated = speakers.map(s => s.id === speaker.id ? target : s);
  } else {
    target = {
      id: 'spk-' + Date.now(),
      name: speaker.name || 'New Speaker',
      position: speaker.position || 'Position',
      organisation: speaker.organisation || 'Faculty / Org',
      bio: speaker.bio || '',
      session_title: speaker.session_title || 'Session Topic',
      session_time: speaker.session_time || '10:00 AM - 10:30 AM',
      session_date: speaker.session_date || '13 Nov 2026',
      photo_url: speaker.photo_url || INITIAL_SPEAKERS[0]?.photo_url || '',
      display_order: speakers.length + 1,
      is_active: speaker.is_active ?? true,
      vote_count: speaker.vote_count || 0
    };
    updated = [...speakers, target];
  }
  setLocalData(STORAGE_KEYS.SPEAKERS, updated);
  return { data: target, error: null };
}

export async function deleteSpeaker(id: string): Promise<{ error: string | null }> {
  if (supabase) {
    const { error } = await supabase.from('speakers').delete().eq('id', id);
    if (error) return { error: error.message };
  }
  const speakers = await getSpeakers();
  const updated = speakers.filter(s => s.id !== id);
  setLocalData(STORAGE_KEYS.SPEAKERS, updated);
  return { error: null };
}

export async function hasVisitorVoted(visitorId: string): Promise<boolean> {
  if (supabase) {
    const { data } = await supabase.from('speaker_votes').select('id').eq('visitor_id', visitorId).limit(1);
    if (data && data.length > 0) return true;
  }
  const votes = getLocalData<SpeakerVote[]>(STORAGE_KEYS.VOTES, []);
  return votes.some(v => v.visitor_id === visitorId);
}

export async function submitSpeakerVote(visitorId: string, speakerId: string): Promise<{ success: boolean; message?: string }> {
  const alreadyVoted = await hasVisitorVoted(visitorId);
  if (alreadyVoted) {
    return { success: false, message: 'You have already cast your vote for the People Choice Award!' };
  }

  const voteEventId = '00000000-0000-0000-0000-000000000002';

  if (supabase) {
    const { error } = await supabase.from('speaker_votes').insert({
      visitor_id: visitorId,
      speaker_id: speakerId,
      voting_event_id: voteEventId
    });
    if (error) {
      if (error.code === '23505') {
        return { success: false, message: 'You have already cast your vote!' };
      }
      console.error('Supabase vote error:', error);
      return { success: false, message: 'Could not record your vote. Check your connection and try again.' };
    }
    return { success: true };
  }

  // Local fallback only when Supabase is not configured
  const votes = getLocalData<SpeakerVote[]>(STORAGE_KEYS.VOTES, []);
  votes.push({
    id: 'vote-' + Date.now(),
    visitor_id: visitorId,
    speaker_id: speakerId,
    voting_event_id: voteEventId,
    created_at: new Date().toISOString()
  });
  setLocalData(STORAGE_KEYS.VOTES, votes);

  // Increment local speaker vote count
  const speakers = await getSpeakers();
  const updatedSpeakers = speakers.map(s => s.id === speakerId ? { ...s, vote_count: (s.vote_count || 0) + 1 } : s);
  setLocalData(STORAGE_KEYS.SPEAKERS, updatedSpeakers);

  return { success: true };
}

// -------------------------------------------------------------
// ADMIN ANALYTICS API
// -------------------------------------------------------------
export async function getAdminAnalytics() {
  const checkpoints = await getCheckpoints(true);
  const speakers = await getSpeakers();

  // Default to local data (offline / Supabase not configured)
  let visits = getLocalData<BoothVisit[]>(STORAGE_KEYS.VISITS, []);
  let speakerVotes = getLocalData<SpeakerVote[]>(STORAGE_KEYS.VOTES, []);
  let rewards = getLocalData<VisitorReward[]>(STORAGE_KEYS.REWARDS, []);
  let visitorIdentities: AdminAnalyticsVisitor[] = [];

  if (supabase) {
    const [visitsRes, votesRes, rewardsRes, visitorsRes] = await Promise.all([
      supabase.from('booth_visits').select('*'),
      supabase.from('speaker_votes').select('*'),
      supabase.from('visitor_rewards').select('*'),
      supabase.from('visitors').select('id, display_name, username, student_id, faculty').order('created_at', { ascending: false }),
    ]);
    if (!visitsRes.error && visitsRes.data) visits = visitsRes.data as BoothVisit[];
    if (!votesRes.error && votesRes.data) speakerVotes = votesRes.data as SpeakerVote[];
    if (!rewardsRes.error && rewardsRes.data) rewards = rewardsRes.data as VisitorReward[];
    if (!visitorsRes.error && visitorsRes.data) visitorIdentities = visitorsRes.data as AdminAnalyticsVisitor[];
  }

  const registeredVisitors = visitorIdentities.length;

  // Aggregate booth performance, ranked by footfall then average rating
  const boothAnalytics: BoothAnalytics[] = checkpoints
    .map(c => {
      const boothVisits = visits.filter(v => v.checkpoint_id === c.id);
      const count = boothVisits.length;
      const avg = count > 0 ? boothVisits.reduce((acc, curr) => acc + curr.rating, 0) / count : 0;
      const quizCompletions = boothVisits.filter(v => v.quiz_completed_at).length;
      const quizPoints = boothVisits.reduce((acc, curr) => acc + (curr.quiz_points || 0), 0);
      return {
        id: c.id,
        name: c.name,
        faculty: c.faculty,
        category: c.category,
        booth_type: c.booth_type || 'required',
        total_visits: count,
        quiz_completions: quizCompletions,
        quiz_points: quizPoints,
        avg_rating: Number(avg.toFixed(2))
      };
    })
    .sort((a, b) => b.total_visits - a.total_visits || b.avg_rating - a.avg_rating);

  const activeVisitors = new Set(visits.map(v => v.visitor_id)).size;
  const totalVisitors = registeredVisitors > 0 ? registeredVisitors : activeVisitors;
  const totalVisits = visits.length;
  const avgOverallRating =
    visits.length > 0 ? (visits.reduce((acc, curr) => acc + curr.rating, 0) / visits.length).toFixed(2) : '0.00';
  const totalVotes = speakerVotes.length;
  const rewardsUnlocked = rewards.length;
  const rewardsClaimed = rewards.filter(r => r.status === 'claimed').length;
  const totalQuizCompletions = boothAnalytics.reduce((acc, booth) => acc + booth.quiz_completions, 0);
  const totalQuizPoints = boothAnalytics.reduce((acc, booth) => acc + booth.quiz_points, 0);

  return {
    totalVisitors,
    totalVisits,
    avgOverallRating,
    totalVotes,
    rewardsUnlocked,
    rewardsClaimed,
    totalQuizCompletions,
    totalQuizPoints,
    boothAnalytics,
    visits,
    speakers,
    speakerVotes,
    visitorIdentities
  };
}

// -------------------------------------------------------------
// ADMIN WRITE HEALTH CHECK
// Performs a harmless insert+delete probe so staff can confirm that
// Row-Level Security allows admin writes before the event.
// -------------------------------------------------------------
export async function checkAdminWrite(): Promise<{ ok: boolean; message: string }> {
  if (!supabase) {
    return { ok: false, message: 'Supabase not configured — running in local offline mode.' };
  }
  const probeId = crypto.randomUUID();
  const { error: insertError } = await supabase
    .from('checkpoints')
    .insert({
      id: probeId,
      name: 'Write probe (safe to ignore)',
      faculty: 'Diagnostic',
      category: 'Exhibition',
      description: 'Temporary diagnostic row.',
      location: 'Diagnostic',
      qr_token: 'probe-' + probeId,
      display_order: 9999
    });
  if (insertError) {
    return { ok: false, message: insertError.message };
  }
  await supabase.from('checkpoints').delete().eq('id', probeId);
  return { ok: true, message: 'Admin write access confirmed.' };
}
