import { NextRequest, NextResponse } from 'next/server';
import type { LeaderboardDay, RankingMetric } from '@/lib/types';
import {
  adoptLegacySession,
  getCheckpointByToken,
  getLeaderboard,
  getRewardSetting,
  getVisitorRank,
  getVisitorReward,
  getVisitorSession,
  isUsernameAvailable,
  listCheckpoints,
  listSpeakers,
  listVisitorVisits,
  registerVisitor,
  submitBoothQuiz,
  submitBoothRating,
  submitSpeakerVote,
  hasVisitorVoted,
  unlockVisitorReward,
  type VisitorIdentityInput,
} from '@/lib/server/db';
import { getVisitorId, setVisitorCookie } from '@/lib/server/session';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function needsVisitor() {
  return json({ error: 'Create your visitor profile first.' }, 401);
}

export async function POST(request: NextRequest) {
  let body: { action?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const action = body.action || '';
  const payload = body.payload || {};
  const visitorId = getVisitorId(request);

  try {
    switch (action) {
      case 'visitor.session': {
        if (visitorId) {
          const session = await getVisitorSession(visitorId);
          if (session) return json({ authenticated: true, ...session });
        }
        const legacyId = typeof payload.legacyId === 'string' ? payload.legacyId : '';
        if (legacyId) {
          const session = await adoptLegacySession(
            legacyId,
            typeof payload.username === 'string' ? payload.username : '',
            typeof payload.matric === 'string' ? payload.matric : ''
          );
          if (session) {
            const response = json({ authenticated: true, ...session });
            setVisitorCookie(response, session.visitorId);
            return response;
          }
        }
        return json({ authenticated: false });
      }

      case 'visitor.register': {
        const identity: VisitorIdentityInput = {
          name: typeof payload.name === 'string' ? payload.name : '',
          username: typeof payload.username === 'string' ? payload.username : '',
          matric: typeof payload.matric === 'string' ? payload.matric : '',
          faculty: typeof payload.faculty === 'string' ? payload.faculty : '',
          showOnLeaderboard: payload.showOnLeaderboard !== false,
        };
        const result = await registerVisitor(identity, visitorId);
        const response = json(result);
        if (result.visitorId && !result.error) setVisitorCookie(response, result.visitorId);
        return response;
      }

      case 'username.available': {
        const username = typeof payload.username === 'string' ? payload.username : '';
        return json(await isUsernameAvailable(username, visitorId));
      }

      case 'checkpoints.list':
        return json(await listCheckpoints(false, true));

      case 'checkpoint.token': {
        const token = typeof payload.token === 'string' ? payload.token : '';
        return json({ checkpoint: token ? await getCheckpointByToken(token) : null });
      }

      case 'reward.setting':
        return json(await getRewardSetting());

      case 'leaderboard': {
        const limit = Number(payload.limit) || 10;
        const metric = (payload.metric === 'stamps' || payload.metric === 'stamps_rating' ? payload.metric : 'points') as RankingMetric;
        const day = (payload.day === 'day1' || payload.day === 'day2' ? payload.day : 'all') as LeaderboardDay;
        return json(await getLeaderboard(limit, metric, visitorId, day));
      }

      case 'visitor.rank': {
        if (!visitorId) return json({ rank: 0, total: 0, entry: null });
        const metric = (payload.metric === 'stamps' || payload.metric === 'stamps_rating' ? payload.metric : 'points') as RankingMetric;
        const day = (payload.day === 'day1' || payload.day === 'day2' ? payload.day : 'all') as LeaderboardDay;
        return json(await getVisitorRank(visitorId, metric, day));
      }

      case 'visitor.visits':
        return visitorId ? json(await listVisitorVisits(visitorId)) : json([]);

      case 'visitor.reward':
        return visitorId ? json(await getVisitorReward(visitorId)) : json(null);

      case 'visitor.reward.unlock':
        return visitorId ? json(await unlockVisitorReward(visitorId)) : needsVisitor();

      case 'rating.submit': {
        if (!visitorId) return needsVisitor();
        const checkpointId = typeof payload.checkpointId === 'string' ? payload.checkpointId : '';
        const rating = Number(payload.rating);
        const review = typeof payload.review === 'string' ? payload.review : undefined;
        if (!checkpointId) return json({ success: false, message: 'Choose a booth first.' }, 400);
        return json(await submitBoothRating(visitorId, checkpointId, rating, review));
      }

      case 'quiz.submit': {
        if (!visitorId) return needsVisitor();
        const checkpointId = typeof payload.checkpointId === 'string' ? payload.checkpointId : '';
        const answers = Array.isArray(payload.answers) ? (payload.answers as Array<number | null>) : [];
        if (!checkpointId) return json({ success: false, correct: 0, total: 0, points: 0 }, 400);
        return json(await submitBoothQuiz(visitorId, checkpointId, answers));
      }

      case 'speakers.list':
        return json(await listSpeakers(false));

      case 'speaker.vote.status':
        return visitorId ? json({ voted: await hasVisitorVoted(visitorId) }) : json({ voted: false });

      case 'speaker.vote.submit': {
        if (!visitorId) return needsVisitor();
        const speakerId = typeof payload.speakerId === 'string' ? payload.speakerId : '';
        if (!speakerId) return json({ success: false, message: 'Choose a speaker.' }, 400);
        return json(await submitSpeakerVote(visitorId, speakerId));
      }

      default:
        return json({ error: 'Unknown action.' }, 404);
    }
  } catch (error) {
    console.error('data api:', error);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
