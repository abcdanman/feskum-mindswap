'use client';

import {
  AdminAnalyticsVisitor,
  BoothVisit,
  Checkpoint,
  EvaluationReport,
  LeaderboardDay,
  LeaderboardEntry,
  RankingMetric,
  RewardSetting,
  Speaker,
  VisitorReward,
  VotingStatus,
} from './types';
import { INITIAL_REWARD_SETTING } from './mockData';
import { cachedFetch, invalidateCached } from './clientCache';

/** Shared, rarely-changing data — safe to reuse across tab navigations
 * for a short window instead of refetching every time. */
const PUBLIC_DATA_TTL_MS = 20_000;

export const isSupabaseConfigured = true;

type ApiResult = Record<string, unknown> | null;

async function dataRequest(action: string, payload: Record<string, unknown> = {}): Promise<ApiResult> {
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, payload }),
    });
    if (!response.ok) return null;
    return (await response.json()) as ApiResult;
  } catch {
    return null;
  }
}

async function adminRequest(action: string, payload: Record<string, unknown> = {}): Promise<ApiResult> {
  try {
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, payload }),
    });
    if (!response.ok) return null;
    return (await response.json()) as ApiResult;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/auth', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) return false;
    const result = (await response.json()) as { authenticated?: boolean };
    return Boolean(result.authenticated);
  } catch {
    return false;
  }
}

export async function adminLogin(passcode: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ passcode }),
    });
    const result = (await response.json()) as { authenticated?: boolean; error?: string };
    if (response.ok && result.authenticated) return { ok: true };
    return { ok: false, error: result.error || 'Invalid passcode.' };
  } catch {
    return { ok: false, error: 'Could not sign in. Check your connection.' };
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch('/api/admin/auth', { method: 'DELETE', credentials: 'same-origin' });
  } catch {
    /* session expires server-side regardless */
  }
}

export async function getCheckpoints(includeInactive = false): Promise<Checkpoint[]> {
  if (includeInactive) {
    const result = await adminRequest('checkpoints.list');
    return (result as Checkpoint[] | null) || [];
  }
  return cachedFetch('checkpoints.list', PUBLIC_DATA_TTL_MS, async () => {
    const result = await dataRequest('checkpoints.list');
    return (result as Checkpoint[] | null) || [];
  });
}

export async function getCheckpointByQrToken(qrToken: string): Promise<Checkpoint | null> {
  const result = await dataRequest('checkpoint.token', { token: qrToken });
  return (result?.checkpoint as Checkpoint | null) || null;
}

export async function saveCheckpoint(
  checkpoint: Partial<Checkpoint>
): Promise<{ data: Checkpoint | null; error: string | null }> {
  const result = await adminRequest('checkpoints.save', { checkpoint });
  if (!result) return { data: null, error: 'Could not save booth. Sign in again and retry.' };
  invalidateCached('checkpoints.list');
  return {
    data: (result.data as Checkpoint | null) || null,
    error: (result.error as string | null) || null,
  };
}

export async function deleteCheckpoint(id: string): Promise<{ error: string | null }> {
  const result = await adminRequest('checkpoints.delete', { id });
  if (!result) return { error: 'Could not delete booth.' };
  invalidateCached('checkpoints.list');
  return { error: (result.error as string | null) || null };
}

// Short TTL, not the usual PUBLIC_DATA_TTL_MS — this is visitor-specific
// and should reflect a just-earned stamp quickly. It exists mainly to
// dedupe the Navbar's own poll against whatever the current page also
// fetches on the same navigation, which otherwise fire as two separate
// round-trips for the identical response.
const VISITS_TTL_MS = 4_000;

export async function getVisitorVisits(_visitorId?: string): Promise<BoothVisit[]> {
  return cachedFetch('visitor.visits', VISITS_TTL_MS, async () => {
    const result = await dataRequest('visitor.visits');
    return (result as BoothVisit[] | null) || [];
  });
}

export async function getAdminVisitorVisits(visitorId: string): Promise<BoothVisit[]> {
  const result = await adminRequest('visitor.visits', { visitorId });
  return ((result?.visits as BoothVisit[] | null) || []);
}

export async function submitBoothRating(
  _visitorId: string,
  checkpointId: string,
  rating: number,
  review?: string
): Promise<{ success: boolean; visit?: BoothVisit; message?: string }> {
  const result = await dataRequest('rating.submit', { checkpointId, rating, review });
  if (!result) return { success: false, message: 'Could not save your stamp. Check your connection and try again.' };
  if (result.success) invalidateCached('visitor.visits');
  return {
    success: Boolean(result.success),
    visit: (result.visit as BoothVisit | undefined) || undefined,
    message: (result.message as string | undefined) || (result.error as string | undefined),
  };
}

export async function submitBoothQuiz(
  _visitorId: string,
  checkpointId: string,
  _questions: unknown,
  answers: Array<number | null>
): Promise<{
  success: boolean;
  visit?: BoothVisit;
  correct: number;
  total: number;
  points: number;
  message?: string;
}> {
  const result = await dataRequest('quiz.submit', { checkpointId, answers });
  if (!result) return { success: false, correct: 0, total: 0, points: 0, message: 'Could not save your quiz.' };
  if (result.success) invalidateCached('visitor.visits');
  return {
    success: Boolean(result.success),
    visit: (result.visit as BoothVisit | undefined) || undefined,
    correct: Number(result.correct) || 0,
    total: Number(result.total) || 0,
    points: Number(result.points) || 0,
    message: (result.message as string | undefined) || (result.error as string | undefined),
  };
}

export async function manualGrantBoothVisit(
  visitorId: string,
  checkpointId: string,
  staffName: string
): Promise<{ success: boolean; visit?: BoothVisit; message?: string }> {
  const result = await adminRequest('visits.manualGrant', { visitorId, checkpointId, staffName });
  if (!result) return { success: false, message: 'Could not record the stamp. Try again.' };
  return {
    success: Boolean(result.success),
    visit: (result.visit as BoothVisit | undefined) || undefined,
    message: (result.message as string | undefined) || (result.error as string | undefined),
  };
}

export async function getRewardSetting(): Promise<RewardSetting> {
  return cachedFetch('reward.setting', PUBLIC_DATA_TTL_MS, async () => {
    const result = await dataRequest('reward.setting');
    return (result as RewardSetting | null) || INITIAL_REWARD_SETTING;
  });
}

export async function saveRewardSetting(
  setting: Partial<RewardSetting>
): Promise<{ data: RewardSetting; error: string | null }> {
  const fallback = { ...INITIAL_REWARD_SETTING, ...setting };
  const result = await adminRequest('reward.save', { setting });
  if (!result) return { data: fallback, error: 'Could not save settings.' };
  invalidateCached('reward.setting');
  return {
    data: (result.data as RewardSetting | null) || fallback,
    error: (result.error as string | null) || null,
  };
}

export async function getVisitorRewardStatus(_visitorId?: string): Promise<VisitorReward | null> {
  const result = await dataRequest('visitor.reward');
  return (result as VisitorReward | null) || null;
}

export async function getAdminVisitorReward(visitorId: string): Promise<VisitorReward | null> {
  const result = await adminRequest('visitor.reward', { visitorId });
  return (result?.reward as VisitorReward | null) || null;
}

export async function unlockVisitorReward(_visitorId?: string): Promise<VisitorReward | null> {
  const result = await dataRequest('visitor.reward.unlock');
  return (result as VisitorReward | null) || null;
}

export async function claimVisitorReward(
  visitorId: string,
  staffName = 'Staff Helpdesk'
): Promise<VisitorReward | null> {
  const result = await adminRequest('visitor.reward.claim', { visitorId, staffName });
  return (result?.reward as VisitorReward | null) || null;
}

export async function registerVisitorIdentity(
  _visitorId: string,
  identity: { name: string; username: string; matric: string; faculty: string; showOnLeaderboard: boolean }
): Promise<{ visitorId: string; reclaimed: boolean; error: string | null }> {
  const result = await dataRequest('visitor.register', identity);
  if (!result) {
    return { visitorId: '', reclaimed: false, error: 'Could not save your profile. Check your connection and try again.' };
  }
  invalidateCached('visitor.visits');
  return {
    visitorId: String(result.visitorId || ''),
    reclaimed: Boolean(result.reclaimed),
    error: (result.error as string | null) || null,
  };
}

export async function isUsernameAvailable(
  username: string,
  _visitorId?: string
): Promise<{ available: boolean; error?: string }> {
  const result = await dataRequest('username.available', { username });
  if (!result) return { available: false, error: 'Could not check that username. Try again.' };
  return {
    available: Boolean(result.available),
    error: (result.error as string | undefined) || undefined,
  };
}

export async function findVisitorByUsername(
  username: string
): Promise<AdminAnalyticsVisitor | null> {
  const result = await adminRequest('visitor.find', { username });
  return (result?.visitor as AdminAnalyticsVisitor | null) || null;
}

export async function uploadImage(file: File, folder = 'booths'): Promise<string | null> {
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      body: form,
      credentials: 'same-origin',
    });
    if (!response.ok) return null;
    const result = (await response.json()) as { url?: string };
    return result.url || null;
  } catch {
    return null;
  }
}

export async function getLeaderboard(
  limit = 10,
  metric: RankingMetric = 'points',
  _myVisitorId?: string,
  day: LeaderboardDay = 'all'
): Promise<LeaderboardEntry[]> {
  const result = await dataRequest('leaderboard', { limit, metric, day });
  return (result as LeaderboardEntry[] | null) || [];
}

export async function getVisitorRank(
  _visitorId: string,
  metric: RankingMetric = 'points',
  day: LeaderboardDay = 'all'
): Promise<{ rank: number; total: number; entry: LeaderboardEntry | null }> {
  const result = await dataRequest('visitor.rank', { metric, day });
  if (!result) return { rank: 0, total: 0, entry: null };
  return {
    rank: Number(result.rank) || 0,
    total: Number(result.total) || 0,
    entry: (result.entry as LeaderboardEntry | null) || null,
  };
}

export async function getSpeakers(includeInactive = false): Promise<Speaker[]> {
  if (includeInactive) {
    const result = await adminRequest('speakers.list');
    return (result as Speaker[] | null) || [];
  }
  return cachedFetch('speakers.list', PUBLIC_DATA_TTL_MS, async () => {
    const result = await dataRequest('speakers.list');
    return (result as Speaker[] | null) || [];
  });
}

export async function saveSpeaker(
  speaker: Partial<Speaker>
): Promise<{ data: Speaker | null; error: string | null }> {
  const result = await adminRequest('speakers.save', { speaker });
  if (!result) return { data: null, error: 'Could not save speaker. Sign in again and retry.' };
  invalidateCached('speakers.list');
  return {
    data: (result.data as Speaker | null) || null,
    error: (result.error as string | null) || null,
  };
}

export async function deleteSpeaker(id: string): Promise<{ error: string | null }> {
  const result = await adminRequest('speakers.delete', { id });
  if (!result) return { error: 'Could not delete speaker.' };
  invalidateCached('speakers.list');
  return { error: (result.error as string | null) || null };
}

export async function hasVisitorVoted(_visitorId?: string): Promise<boolean> {
  const result = await dataRequest('speaker.vote.status');
  return Boolean(result?.voted);
}

export async function submitSpeakerVote(
  _visitorId: string,
  speakerId: string
): Promise<{ success: boolean; message?: string }> {
  const result = await dataRequest('speaker.vote.submit', { speakerId });
  if (!result) return { success: false, message: 'Could not record your vote. Check your connection and try again.' };
  if (result.success) invalidateCached('speakers.list');
  return {
    success: Boolean(result.success),
    message: (result.message as string | undefined) || (result.error as string | undefined),
  };
}

export async function getVotingStatus(): Promise<VotingStatus> {
  return cachedFetch('voting.status', PUBLIC_DATA_TTL_MS, async () => {
    const result = await dataRequest('voting.status');
    return (result as VotingStatus | null) || { is_active: false, title: "People's Choice Award", description: '' };
  });
}

export async function setVotingActive(active: boolean): Promise<{ error: string | null }> {
  const result = await adminRequest('voting.setActive', { active });
  if (!result) return { error: 'Could not update voting status.' };
  invalidateCached('voting.status');
  return { error: (result.error as string | null) || null };
}

export async function getAdminAnalytics() {
  const result = await adminRequest('analytics');
  return (result as {
    totalVisitors: number;
    totalVisits: number;
    avgOverallRating: string;
    totalVotes: number;
    rewardsUnlocked: number;
    rewardsClaimed: number;
    totalQuizCompletions: number;
    totalQuizPoints: number;
    boothAnalytics: import('./types').BoothAnalytics[];
    visits: BoothVisit[];
    speakers: Speaker[];
    speakerVotes: import('./types').SpeakerVote[];
    visitorIdentities: AdminAnalyticsVisitor[];
  } | null) || {
    totalVisitors: 0,
    totalVisits: 0,
    avgOverallRating: '0.00',
    totalVotes: 0,
    rewardsUnlocked: 0,
    rewardsClaimed: 0,
    totalQuizCompletions: 0,
    totalQuizPoints: 0,
    boothAnalytics: [],
    visits: [],
    speakers: [],
    speakerVotes: [],
    visitorIdentities: [],
  };
}

const EMPTY_EVALUATION_REPORT: EvaluationReport = {
  day: 'all',
  generated_at: new Date(0).toISOString(),
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
  recommendations: [],
};

export async function getEvaluationReport(day: LeaderboardDay = 'all'): Promise<EvaluationReport> {
  const result = await adminRequest('evaluation', { day });
  return (result as EvaluationReport | null) || { ...EMPTY_EVALUATION_REPORT, day };
}

export async function checkAdminWrite(): Promise<{ ok: boolean; message: string }> {
  const result = await adminRequest('write.check');
  if (!result) return { ok: false, message: 'Could not verify admin write access.' };
  return { ok: Boolean(result.ok), message: String(result.message || '') };
}

export async function subscribeToPush(subscription: PushSubscriptionJSON): Promise<{ error: string | null }> {
  const result = await dataRequest('push.subscribe', { subscription });
  if (!result) return { error: 'Could not save your subscription.' };
  return { error: (result.error as string | null) || null };
}

export async function unsubscribeFromPush(endpoint: string): Promise<{ error: string | null }> {
  const result = await dataRequest('push.unsubscribe', { endpoint });
  if (!result) return { error: 'Could not remove your subscription.' };
  return { error: (result.error as string | null) || null };
}

export async function broadcastPushNotification(
  title: string,
  body: string,
  url?: string
): Promise<{ sent: number; failed: number; error: string | null }> {
  const result = await adminRequest('push.broadcast', { title, body, url });
  if (!result) return { sent: 0, failed: 0, error: 'Could not send the notification.' };
  return {
    sent: Number(result.sent) || 0,
    failed: Number(result.failed) || 0,
    error: (result.error as string | null) || null,
  };
}
