// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabase, settingsUpdate } = vi.hoisted(() => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
  settingsUpdate: vi.fn(),
}));

vi.mock('./supabase', () => ({ supabase }));
vi.mock('./db', () => ({ db: { settings: { update: settingsUpdate } } }));
vi.mock('./sync', () => ({
  ensureSession: vi.fn(async () => ({ id: 'owner' })),
  getUser: vi.fn(async () => ({ id: 'owner' })),
}));

import { createPartnerShare, revokePartnerShare, type SharePayload } from './partnerShare';

const REF = { token: 'tok', key: 'key', createdAt: '2026-10-08T00:00:00.000Z' };
const PAYLOAD: SharePayload = {
  name: 'Ana',
  lastPeriodStart: '2026-10-01',
  avgCycleLength: 28,
  avgPeriodLength: 5,
  lutealLength: 14,
  updatedAt: '2026-10-08T00:00:00.000Z',
};

/** The partner-side lookup: a live link returns its row, a dead one nothing. */
const liveLink = (live: boolean) =>
  supabase.rpc.mockResolvedValue({
    data: live ? [{ ciphertext: 'c', nonce: 'n', expires_at: 'infinity' }] : [],
    error: null,
  });

describe('partner share link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue({
      delete: () => ({ eq: async () => ({ error: null }) }),
    });
  });

  it('is created with no expiry date', async () => {
    const insert = vi.fn(() => ({
      select: () => ({ single: async () => ({ data: { token: 'tok' }, error: null }) }),
    }));
    supabase.from.mockReturnValue({ insert });

    const ref = await createPartnerShare(PAYLOAD);

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ expires_at: 'infinity' }));
    expect(ref).not.toHaveProperty('expiresAt');
  });

  it('forgets the link locally once the server confirms it is gone', async () => {
    liveLink(false);

    await revokePartnerShare(REF);

    expect(supabase.rpc).toHaveBeenCalledWith('get_partner_share', { p_token: 'tok' });
    expect(settingsUpdate).toHaveBeenCalledWith('user', expect.objectContaining({ partnerShare: null }));
  });

  it('keeps the link and reports it when the delete silently missed', async () => {
    // RLS: a session that does not own the row deletes 0 rows with no error.
    liveLink(true);

    await expect(revokePartnerShare(REF)).rejects.toThrow(/continua ativo/);
    expect(settingsUpdate).not.toHaveBeenCalled();
  });
});
