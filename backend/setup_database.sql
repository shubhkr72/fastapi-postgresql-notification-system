CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION notify_user_notification() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'user_notification',
    json_build_object('userId', NEW.user_id, 'message', NEW.message)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_notification_trigger ON notifications;
CREATE TRIGGER user_notification_trigger
AFTER INSERT ON notifications
FOR EACH ROW EXECUTE FUNCTION notify_user_notification();