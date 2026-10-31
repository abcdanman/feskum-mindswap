import { NextRequest, NextResponse } from 'next/server';
import {
  checkAdminWrite,
  claimVisitorReward,
  deleteCheckpoint,
  deleteSpeaker,
  findVisitorByUsername,
  getAdminAnalytics,
  getVisitorReward,
  listCheckpoints,
  listSpeakers,
  listVisitorVisits,
  saveCheckpoint,
  saveRewardSetting,
  saveSpeaker,
} from '@/lib/server/db';
import { hasAdminSession } from '@/lib/server/session';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  if (!hasAdminSession(request)) {
    return json({ error: 'Admin session required.' }, 401);
  }

  let body: { action?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const action = body.action || '';
  const payload = body.payload || {};

  try {
    switch (action) {
      case 'analytics':
        return json(await getAdminAnalytics());

      case 'checkpoints.list':
        return json(await listCheckpoints(true, false));

      case 'checkpoints.save':
        return json(await saveCheckpoint(payload.checkpoint as Record<string, unknown>));

      case 'checkpoints.delete':
        return json(await deleteCheckpoint(String(payload.id || '')));

      case 'speakers.list':
        return json(await listSpeakers(true));

      case 'speakers.save':
        return json(await saveSpeaker(payload.speaker as Record<string, unknown>));

      case 'speakers.delete':
        return json(await deleteSpeaker(String(payload.id || '')));

      case 'reward.save':
        return json(await saveRewardSetting(payload.setting as Record<string, unknown>));

      case 'visitor.find':
        return json({ visitor: await findVisitorByUsername(String(payload.username || '')) });

      case 'visitor.reward':
        return json({ reward: await getVisitorReward(String(payload.visitorId || '')) });

      case 'visitor.visits':
        return json({ visits: await listVisitorVisits(String(payload.visitorId || '')) });

      case 'visitor.reward.claim':
        return json({
          reward: await claimVisitorReward(
            String(payload.visitorId || ''),
            typeof payload.staffName === 'string' ? payload.staffName : 'Staff Helpdesk'
          ),
        });

      case 'write.check':
        return json(await checkAdminWrite());

      default:
        return json({ error: 'Unknown action.' }, 404);
    }
  } catch (error) {
    console.error('admin api:', error);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
