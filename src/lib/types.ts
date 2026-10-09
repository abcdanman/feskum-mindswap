export interface Visitor {
  id: string;
  display_name?: string | null;
  device_fingerprint?: string | null;
  created_at?: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  faculty: string;
  category: string;
  description: string;
  location: string;
  image_url?: string | null;
  qr_token: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface BoothVisit {
  id: string;
  visitor_id: string;
  checkpoint_id: string;
  rating: number;
  review?: string | null;
  visited_at: string;
  checkpoint?: Checkpoint;
}

export interface RewardSetting {
  id: string;
  title: string;
  stamp_threshold: number;
  description: string;
  is_active: boolean;
  created_at?: string;
}

export interface VisitorReward {
  id: string;
  visitor_id: string;
  reward_id: string;
  status: 'unlocked' | 'claimed';
  claimed_at?: string | null;
  claimed_by_staff?: string | null;
  created_at?: string;
}

export interface Speaker {
  id: string;
  name: string;
  position: string;
  organisation: string;
  bio: string;
  photo_url?: string | null;
  session_title: string;
  session_time: string;
  session_date: string;
  display_order: number;
  is_active: boolean;
  vote_count?: number;
}

export interface VotingEvent {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  voting_rule: string;
  created_at?: string;
}

export interface SpeakerVote {
  id: string;
  visitor_id: string;
  speaker_id: string;
  voting_event_id: string;
  created_at?: string;
}

export interface BoothAnalytics {
  id: string;
  name: string;
  faculty: string;
  category: string;
  total_visits: number;
  avg_rating: number;
}
