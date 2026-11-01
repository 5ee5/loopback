-- The audit log is append-only: nothing, not even the app, can rewrite history.
CREATE TRIGGER `admin_events_no_update` BEFORE UPDATE ON `admin_events`
BEGIN
  SELECT RAISE(ABORT, 'admin_events is append-only');
END;
--> statement-breakpoint
CREATE TRIGGER `admin_events_no_delete` BEFORE DELETE ON `admin_events`
BEGIN
  SELECT RAISE(ABORT, 'admin_events is append-only');
END;
