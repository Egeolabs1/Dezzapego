-- ⚠️ DANGER: This script deletes ALL ads from the database.
-- Use this to clean up example data.

-- Due to the CASCADE constraints we added earlier, this will also automatically delete:
-- - Favorites associated with these ads
-- - Reports associated with these ads
-- - Messages associated with these ads (if linked)
-- - Notifications associated with these ads

DELETE FROM public.ads;

-- Optional: Reset ID sequence if you want new ads to start from 1 (only if using serial/integer IDs, not UUIDs)
-- Since we use UUIDs (gen_random_uuid()), this is not needed.
