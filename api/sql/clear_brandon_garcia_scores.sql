-- Clear Brandon Garcia's end_events for testing
-- Run this after deploying the fixed JS to test with clean data

DELETE FROM end_events 
WHERE round_archer_id IN (
  SELECT id FROM round_archers 
  WHERE archer_name LIKE '%Brandon Garcia%'
);
