const SUPABASE_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

type SupabaseEnvKey = (typeof SUPABASE_ENV_KEYS)[number];

export type SupabaseEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function missingSupabaseEnvMessage(missing: SupabaseEnvKey[]) {
  return `Missing Supabase environment variable${missing.length === 1 ? '' : 's'}: ${missing.join(
    ', '
  )}`;
}

export function getSupabaseEnv(): SupabaseEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missing = SUPABASE_ENV_KEYS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(missingSupabaseEnvMessage(missing));
  }

  try {
    const parsedUrl = new URL(supabaseUrl as string);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('invalid protocol');
    }
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid http(s) URL');
  }

  return {
    supabaseUrl: supabaseUrl as string,
    supabaseAnonKey: supabaseAnonKey as string,
  };
}

