-- Add applicable_emp_types to hr_leave_types for filtering by employee type
ALTER TABLE hr_leave_types ADD COLUMN IF NOT EXISTS applicable_emp_types TEXT NOT NULL DEFAULT 'permanent,consultant,contract,intern';
