-- =========================================================
-- CREATE/UPDATE PAYMENTS TABLE - COMPLETE SOLUTION
-- =========================================================
-- Run this in Supabase SQL Editor
-- Fixes ALL payment-related errors

-- 1. Create the payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_type TEXT NOT NULL DEFAULT 'manual',
    payment_method TEXT NOT NULL DEFAULT 'cash',
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'completed',  -- 'completed' or 'pending'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add missing columns if table already exists
DO $$
BEGIN
    -- Add payment_method if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_method TEXT DEFAULT 'cash';
    END IF;

    -- Add payment_type if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_type TEXT DEFAULT 'manual';
    END IF;

    -- Add status if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN status TEXT DEFAULT 'completed';
    END IF;

    -- Add payment_date if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'payment_date'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_date TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add client_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'client_id'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;

    -- Add notes if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN notes TEXT;
    END IF;
END $$;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_coach_id ON public.payments(coach_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5. Drop and recreate RLS policies
DROP POLICY IF EXISTS "Coaches can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Coaches can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Coaches can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Coaches can delete own payments" ON public.payments;

CREATE POLICY "Coaches can view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert own payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update own payments" ON public.payments
    FOR UPDATE USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own payments" ON public.payments
    FOR DELETE USING (auth.uid() = coach_id);

-- 6. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON public.payments;
CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- 7. Grant permissions
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- 8. Update any old status values to new format
UPDATE public.payments 
SET status = 'completed' 
WHERE status IS NULL OR status = '' OR status = 'paid';

UPDATE public.payments 
SET status = 'pending' 
WHERE status = 'waiting';

-- 9. Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;

-- =========================================================
-- PAYMENT LOGIC:
-- =========================================================
-- status = 'completed' → Shows in "Total Collected"
-- status = 'pending'   → Shows in "Pending Payments" (Overdue)
--
-- When you add a payment:
--   - If status='completed' → Money is collected, reduces client balance
--   - If status='pending'   → Money is expected, adds to client balance
--
-- When you change status from 'pending' to 'completed':
--   - Money moves from "Overdue" to "Total Collected"
--   - Client's balance_owed is reduced
-- =========================================================

SELECT '✅ SUCCESS! Payments table is ready.' AS result;
