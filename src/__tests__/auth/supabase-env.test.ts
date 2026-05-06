describe('getSupabaseEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns configured Supabase values', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const { getSupabaseEnv } = await import('@/lib/supabase/env');

    expect(getSupabaseEnv()).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
    });
  });

  it('fails clearly when required Supabase values are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { getSupabaseEnv } = await import('@/lib/supabase/env');

    expect(() => getSupabaseEnv()).toThrow(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  });

  it('rejects invalid Supabase URLs', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-url';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const { getSupabaseEnv } = await import('@/lib/supabase/env');

    expect(() => getSupabaseEnv()).toThrow(
      'NEXT_PUBLIC_SUPABASE_URL must be a valid http(s) URL'
    );
  });
});
