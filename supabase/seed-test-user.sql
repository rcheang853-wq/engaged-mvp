-- Create a test user directly in auth.users with confirmed email
-- This bypasses the email confirmation requirement for local testing

DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Generate a UUID for the test user
  test_user_id := gen_random_uuid();
  
  -- Insert into auth.users (this is the Supabase auth table)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    test_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo@test.com',
    -- Password: Demo123456 (bcrypt hash)
    crypt('Demo123456', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Demo User"}'::jsonb
  )
  ON CONFLICT (email) DO NOTHING;

  -- Insert matching profile
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    test_user_id,
    'demo@test.com',
    'Demo User',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

END $$;

-- Verify the user was created
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at
FROM auth.users
WHERE email = 'demo@test.com';
