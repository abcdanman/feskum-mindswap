import { createClient } from '@supabase/supabase-js';
import { Checkpoint, BoothVisit, Speaker, RewardSetting, VisitorReward, SpeakerVote, BoothAnalytics } from './types';
import { INITIAL_CHECKPOINTS, INITIAL_SPEAKERS, INITIAL_REWARD_SETTING } from './mockData';

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
export async function getCheckpoints(): Promise<Checkpoint[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .order('display_order', { ascending: true });
    if (!error && data && data.length > 0) return data;
  }
  return getLocalData<Checkpoint[]>(STORAGE_KEYS.CHECKPOINTS, INITIAL_CHECKPOINTS);
}

export async function getCheckpointByQrToken(qrToken: string): Promise<Checkpoint | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('qr_token', qrToken)
      .single();
    if (!error && data) return data;
  }
  const checkpoints = await getCheckpoints();
  return checkpoints.find(c => c.qr_token === qrToken || c.id === qrToken) || null;
}

export async function saveCheckpoint(checkpoint: Partial<Checkpoint>): Promise<Checkpoint> {
  if (supabase) {
    const { data, error } = await supabase.from('checkpoints').upsert(checkpoint).select().single();
    if (!error && data) return data;
  }
  const checkpoints = await getCheckpoints();
  let updated: Checkpoint[];
  let target: Checkpoint;
  if (checkpoint.id) {
    target = { ...checkpoints.find(c => c.id === checkpoint.id)!, ...checkpoint } as Checkpoint;
    updated = checkpoints.map(c => c.id === checkpoint.id ? target : c);
  } else {
    target = {
      id: 'booth-' + Date.now(),
      name: checkpoint.name || 'New Booth',
      faculty: checkpoint.faculty || 'Faculty',
      category: checkpoint.category || 'Exhibition',
      description: checkpoint.description || '',
      location: checkpoint.location || 'DTC Marquee',
      qr_token: checkpoint.qr_token || 'qr-' + Date.now(),
      is_active: checkpoint.is_active ?? true,
      display_order: checkpoints.length + 1,
    };
    updated = [...checkpoints, target];
  }
  setLocalData(STORAGE_KEYS.CHECKPOINTS, updated);
  return target;
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
    } else if (data) {
      return { success: true, visit: data };
    }
  }

  // Fallback to local storage
  const allVisits = getLocalData<BoothVisit[]>(STORAGE_KEYS.VISITS, []);
  allVisits.push(newVisit);
  setLocalData(STORAGE_KEYS.VISITS, allVisits);
  return { success: true, visit: newVisit };
}

// -------------------------------------------------------------
// REWARD SYSTEM API
// -------------------------------------------------------------
export async function getRewardSetting(): Promise<RewardSetting> {
  if (supabase) {
    const { data, error } = await supabase.from('reward_settings').select('*').limit(1).single();
    if (!error && data) return data;
  }
  return getLocalData<RewardSetting>(STORAGE_KEYS.REWARD_SETTINGS, INITIAL_REWARD_SETTING);
}

export async function saveRewardSetting(setting: Partial<RewardSetting>): Promise<RewardSetting> {
  const current = await getRewardSetting();
  const updated = { ...current, ...setting };
  if (supabase) {
    await supabase.from('reward_settings').upsert(updated);
  }
  setLocalData(STORAGE_KEYS.REWARD_SETTINGS, updated);
  return updated;
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
// SPEAKERS & PEOPLE'S CHOICE VOTING API
// -------------------------------------------------------------
export async function getSpeakers(): Promise<Speaker[]> {
  if (supabase) {
    const { data, error } = await supabase.from('speakers').select('*').order('display_order', { ascending: true });
    if (!error && data && data.length > 0) return data;
  }
  return getLocalData<Speaker[]>(STORAGE_KEYS.SPEAKERS, INITIAL_SPEAKERS);
}

export async function saveSpeaker(speaker: Partial<Speaker>): Promise<Speaker> {
  if (supabase) {
    const { data, error } = await supabase.from('speakers').upsert(speaker).select().single();
    if (!error && data) return data;
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
      session_date: speaker.session_date || '11 Nov 2026',
      photo_url: speaker.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      display_order: speakers.length + 1,
      is_active: speaker.is_active ?? true,
      vote_count: speaker.vote_count || 0
    };
    updated = [...speakers, target];
  }
  setLocalData(STORAGE_KEYS.SPEAKERS, updated);
  return target;
}

export async function deleteSpeaker(id: string): Promise<void> {
  if (supabase) {
    await supabase.from('speakers').delete().eq('id', id);
  }
  const speakers = await getSpeakers();
  const updated = speakers.filter(s => s.id !== id);
  setLocalData(STORAGE_KEYS.SPEAKERS, updated);
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
    }
  }

  // Local fallback
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
  const checkpoints = await getCheckpoints();
  const visits = getLocalData<BoothVisit[]>(STORAGE_KEYS.VISITS, []);
  const votes = getLocalData<SpeakerVote[]>(STORAGE_KEYS.VOTES, []);
  const rewards = getLocalData<VisitorReward[]>(STORAGE_KEYS.REWARDS, []);
  const speakers = await getSpeakers();

  // Aggregate booth performance
  const boothAnalytics: BoothAnalytics[] = checkpoints.map(c => {
    const boothVisits = visits.filter(v => v.checkpoint_id === c.id);
    const count = boothVisits.length;
    const avg = count > 0 ? boothVisits.reduce((acc, curr) => acc + curr.rating, 0) / count : 0;
    return {
      id: c.id,
      name: c.name,
      faculty: c.faculty,
      category: c.category,
      total_visits: count,
      avg_rating: Number(avg.toFixed(2))
    };
  });

  const totalVisitors = new Set(visits.map(v => v.visitor_id)).size || (visits.length > 0 ? visits.length : 0);
  const totalVisits = visits.length;
  const avgOverallRating = visits.length > 0 ? (visits.reduce((acc, curr) => acc + curr.rating, 0) / visits.length).toFixed(2) : '5.00';
  const totalVotes = votes.length + speakers.reduce((acc, s) => acc + (s.vote_count || 0), 0);
  const rewardsUnlocked = rewards.length;
  const rewardsClaimed = rewards.filter(r => r.status === 'claimed').length;

  return {
    totalVisitors,
    totalVisits,
    avgOverallRating,
    totalVotes,
    rewardsUnlocked,
    rewardsClaimed,
    boothAnalytics,
    visits,
    speakers
  };
}
