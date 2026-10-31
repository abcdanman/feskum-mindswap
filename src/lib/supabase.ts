'use client';

import {
  AdminAnalyticsVisitor,
  BoothVisit,
  Checkpoint,
  LeaderboardDay,
  LeaderboardEntry,
  RankingMetric,
  RewardSetting,
  Speaker,
  VisitorReward,
} from './types';
import { INITIAL_REWARD_SETTING } from './mockData';

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
  const result = await dataRequest('checkpoints.list');
  return (result as Checkpoint[] | null) || [];
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
  return {
    data: (result.data as Checkpoint | null) || null,
    error: (result.error as string | null) || null,
  };
}

export async function deleteCheckpoint(id: string): Promise<{ error: string | null }> {
  const result = await adminRequest('checkpoints.delete', { id });
  if (!result) return { error: 'Could not delete booth.' };
  return { error: (result.error as string | null) || null };
}

export async function getVisitorVisits(_visitorId?: string): Promise<BoothVisit[]> {
  const result = await dataRequest('visitor.visits');
  return (result as BoothVisit[] | null) || [];
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
  return {
    success: Boolean(result.success),
    visit: (result.visit as BoothVisit | undefined) || undefined,
    correct: Number(result.correct) || 0,
    total: Number(result.total) || 0,
    points: Number(result.points) || 0,
    message: (result.message as string | undefined) || (result.error as string | undefined),
  };
}

export async function getRewardSetting(): Promise<RewardSetting> {
  const result = await dataRequest('reward.setting');
  return (result as RewardSetting | null) || INITIAL_REWARD_SETTING;
}

export async function saveRewardSetting(
  setting: Partial<RewardSetting>
): Promise<{ data: RewardSetting; error: string | null }> {
  const fallback = { ...INITIAL_REWARD_SETTING, ...setting };
  const result = await adminRequest('reward.save', { setting });
  if (!result) return { data: fallback, error: 'Could not save settings.' };
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
  const result = includeInactive ? await adminRequest('speakers.list') : await dataRequest('speakers.list');
  return (result as Speaker[] | null) || [];
}

export async function saveSpeaker(
  speaker: Partial<Speaker>
): Promise<{ data: Speaker | null; error: string | null }> {
  const result = await adminRequest('speakers.save', { speaker });
  if (!result) return { data: null, error: 'Could not save speaker. Sign in again and retry.' };
  return {
    data: (result.data as Speaker | null) || null,
    error: (result.error as string | null) || null,
  };
}

export async function deleteSpeaker(id: string): Promise<{ error: string | null }> {
  const result = await adminRequest('speakers.delete', { id });
  if (!result) return { error: 'Could not delete speaker.' };
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
  return {
    success: Boolean(result.success),
    message: (result.message as string | undefined) || (result.error as string | undefined),
  };
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

export async function checkAdminWrite(): Promise<{ ok: boolean; message: string }> {
  const result = await adminRequest('write.check');
  if (!result) return { ok: false, message: 'Could not verify admin write access.' };
  return { ok: Boolean(result.ok), message: String(result.message || '') };
}
