-- Add reservoir_id column if it doesn't exist
ALTER TABLE reservoir 
ADD COLUMN IF NOT EXISTS reservoir_id TEXT;

-- Create index on reservoir_id for better performance
CREATE INDEX IF NOT EXISTS idx_reservoir_reservoir_id ON reservoir(reservoir_id);

-- Check if cresv column exists
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'reservoir'
  AND column_name = 'cresv'
) as has_cresv;

-- Update reservoir_id from cresv column
UPDATE reservoir
SET reservoir_id = cresv
WHERE type = 'อ่างเก็บน้ำขนาดกลาง'
AND cresv IS NOT NULL;

-- Log the number of updated records
SELECT 
  'Updated ' || COUNT(*) || ' medium reservoirs with reservoir_id'
FROM reservoir 
WHERE type = 'อ่างเก็บน้ำขนาดกลาง'
AND reservoir_id IS NOT NULL; 