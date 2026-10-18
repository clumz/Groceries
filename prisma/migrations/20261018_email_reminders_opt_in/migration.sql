-- Weekly reminder emails are opt-in. Existing rows only had `true` as the
-- column default, not as a choice the user made, so turn them all off.
ALTER TABLE "user_preferences" ALTER COLUMN "email_reminders" SET DEFAULT false;
UPDATE "user_preferences" SET "email_reminders" = false;
