ALTER TABLE public.commission_payments
  ADD COLUMN IF NOT EXISTS amount_before_tax numeric,
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0;

-- Preserve completed historical payments exactly as recorded. They predate the
-- tax rule, so their gross and net values are intentionally the same.
UPDATE public.commission_payments
SET
  amount_before_tax = amount,
  tax_rate = 0,
  tax_amount = 0
WHERE amount_before_tax IS NULL;

ALTER TABLE public.commission_payments
  ADD CONSTRAINT commission_payments_tax_rate_range
    CHECK (tax_rate >= 0 AND tax_rate <= 1),
  ADD CONSTRAINT commission_payments_tax_amount_nonnegative
    CHECK (tax_amount >= 0),
  ADD CONSTRAINT commission_payments_amount_before_tax_nonnegative
    CHECK (amount_before_tax IS NULL OR amount_before_tax >= 0);

COMMENT ON COLUMN public.commission_payments.amount IS
  'Commission amount transferred. For tax-aware rows, this is the net amount after taxes.';
COMMENT ON COLUMN public.commission_payments.amount_before_tax IS
  'Gross commission amount before taxes. Historical rows retain the original amount.';
COMMENT ON COLUMN public.commission_payments.tax_rate IS
  'Tax rate applied to this payment. Historical rows created before tax tracking use 0.';
COMMENT ON COLUMN public.commission_payments.tax_amount IS
  'Tax amount deducted from amount_before_tax to produce amount.';
