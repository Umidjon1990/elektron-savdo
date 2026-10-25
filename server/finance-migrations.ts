/** Additive journals; historical purchase principals are deliberately NOT inferred. */
export const financeMigrationSql = `
CREATE TABLE IF NOT EXISTS finance_migrations (version text PRIMARY KEY, applied_at timestamp NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS finance_operations (
 tenant_id varchar NOT NULL REFERENCES tenants(id), kind text NOT NULL, id text NOT NULL,
 fingerprint text NOT NULL, response jsonb NOT NULL, created_at timestamp NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,kind,id));
CREATE TABLE IF NOT EXISTS stock_movements (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id varchar NOT NULL REFERENCES tenants(id), product_id varchar NOT NULL,
 operation_id text NOT NULL, quantity numeric NOT NULL, reason text NOT NULL, date timestamp NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS stock_movement_operation ON stock_movements(tenant_id,operation_id,product_id,reason);
CREATE TABLE IF NOT EXISTS supplier_purchases (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id varchar NOT NULL REFERENCES tenants(id), product_id varchar NOT NULL,
 supplier text NOT NULL, currency text NOT NULL CHECK(currency IN ('usd','uzs')), rate numeric(24,6),
 quantity numeric NOT NULL, principal numeric(24,8) NOT NULL CHECK(principal>=0), paid numeric(24,8) NOT NULL DEFAULT 0 CHECK(paid>=0 AND paid<=principal),
 source text NOT NULL, payment_method text NOT NULL DEFAULT 'nasiya', date timestamp NOT NULL DEFAULT now(), CHECK(source IN ('purchase','opening')));
CREATE UNIQUE INDEX IF NOT EXISTS supplier_opening_once ON supplier_purchases(tenant_id,product_id) WHERE source='opening';
CREATE TABLE IF NOT EXISTS supplier_payments (
 id text NOT NULL, tenant_id varchar NOT NULL REFERENCES tenants(id), supplier text NOT NULL, currency text NOT NULL, amount numeric(24,8) NOT NULL CHECK(amount>0),
 account text NOT NULL, allocations jsonb NOT NULL, date timestamp NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,id));
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS initial_paid_amount numeric(24,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS finance_tracked boolean NOT NULL DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS voided_at timestamp;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS order_id varchar;
ALTER TABLE debt_payments ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS classification text NOT NULL DEFAULT 'unclassified';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS voided_at timestamp;
ALTER TABLE cash_register_entries ADD COLUMN IF NOT EXISTS voided_at timestamp;
ALTER TABLE cash_register_entries ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
CREATE TABLE IF NOT EXISTS finance_audit (
 id varchar PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id varchar NOT NULL REFERENCES tenants(id), user_id text NOT NULL,
 kind text NOT NULL, operation_id text NOT NULL, before_value jsonb, after_value jsonb, reason text NOT NULL, date timestamp NOT NULL DEFAULT now());
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM finance_migrations WHERE version='2026-10-finance-v1') THEN
  ALTER TABLE products ALTER COLUMN stock TYPE numeric USING stock::text::numeric,
    ALTER COLUMN supplier_original_price TYPE numeric USING supplier_original_price::text::numeric;
  ALTER TABLE transactions ALTER COLUMN total_amount TYPE numeric(24,2), ALTER COLUMN total_profit TYPE numeric(24,2), ALTER COLUMN paid_amount TYPE numeric(24,2);
  ALTER TABLE orders ALTER COLUMN total_amount TYPE numeric(24,2), ALTER COLUMN debt_amount TYPE numeric(24,2);
  ALTER TABLE expenses ALTER COLUMN amount TYPE numeric(24,2);
  ALTER TABLE cash_register_entries ALTER COLUMN amount TYPE numeric(24,2);
  ALTER TABLE debt_payments ALTER COLUMN amount TYPE numeric(24,2);
  ALTER TABLE independent_debts ALTER COLUMN total_amount TYPE numeric(24,2), ALTER COLUMN paid_amount TYPE numeric(24,2);
  ALTER TABLE independent_debt_payments ALTER COLUMN amount TYPE numeric(24,2);
  ALTER TABLE products ADD CONSTRAINT finance_product_stock CHECK(stock>=0 AND stock<=1000000000000) NOT VALID;
  ALTER TABLE transactions ADD CONSTRAINT finance_sale_amount CHECK(total_amount>=0 AND total_amount<=1000000000000 AND paid_amount>=0 AND paid_amount<=total_amount) NOT VALID;
  ALTER TABLE expenses ADD CONSTRAINT finance_expense_amount CHECK(amount>0 AND amount<=1000000000000) NOT VALID;
  ALTER TABLE cash_register_entries ADD CONSTRAINT finance_cash_amount CHECK(amount>0 AND amount<=1000000000000) NOT VALID;
  ALTER TABLE debt_payments ADD CONSTRAINT finance_debt_payment_amount CHECK(amount>0 AND amount<=1000000000000) NOT VALID;
  INSERT INTO finance_migrations(version) VALUES('2026-10-finance-v1');
 END IF;
END $$;
`;
