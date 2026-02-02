-- Function to increment usage counts atomically
CREATE OR REPLACE FUNCTION increment_usage_count(
  p_user_id uuid,
  p_usage_date date,
  p_field_name text
) RETURNS integer AS $$
DECLARE
  current_count integer := 0;
BEGIN
  -- Get current count or create record if it doesn't exist
  INSERT INTO user_usage (user_id, date, swipes_count, superlikes_count, searches_count, advanced_filters_used, early_alerts_sent)
  VALUES (p_user_id, p_usage_date, 0, 0, 0, 0, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  -- Increment the specified field
  CASE p_field_name
    WHEN 'swipes_count' THEN
      UPDATE user_usage SET swipes_count = swipes_count + 1
      WHERE user_id = p_user_id AND date = p_usage_date
      RETURNING swipes_count INTO current_count;
    WHEN 'superlikes_count' THEN
      UPDATE user_usage SET superlikes_count = superlikes_count + 1
      WHERE user_id = p_user_id AND date = p_usage_date
      RETURNING superlikes_count INTO current_count;
    WHEN 'searches_count' THEN
      UPDATE user_usage SET searches_count = searches_count + 1
      WHERE user_id = p_user_id AND date = p_usage_date
      RETURNING searches_count INTO current_count;
    WHEN 'advanced_filters_used' THEN
      UPDATE user_usage SET advanced_filters_used = advanced_filters_used + 1
      WHERE user_id = p_user_id AND date = p_usage_date
      RETURNING advanced_filters_used INTO current_count;
    WHEN 'early_alerts_sent' THEN
      UPDATE user_usage SET early_alerts_sent = early_alerts_sent + 1
      WHERE user_id = p_user_id AND date = p_usage_date
      RETURNING early_alerts_sent INTO current_count;
    ELSE
      RAISE EXCEPTION 'Invalid field name: %', p_field_name;
  END CASE;

  RETURN current_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_usage_count(uuid, date, text) TO authenticated;