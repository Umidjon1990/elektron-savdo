import { pool } from "./db";

export async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log("Running database migrations...");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        author TEXT NOT NULL,
        price INTEGER NOT NULL,
        stock INTEGER NOT NULL,
        category TEXT NOT NULL,
        barcode TEXT NOT NULL UNIQUE,
        image TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        items JSON NOT NULL,
        total_amount INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        payment_method TEXT NOT NULL,
        delivery_type TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#3b82f6'
      );
      
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        items JSON NOT NULL,
        total_amount INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed'
      );
      
      -- Add status column if it doesn't exist (for existing databases)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='status') THEN
          ALTER TABLE transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';
        END IF;
      END $$;
      
      -- Add cost_price column to products if it doesn't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cost_price') THEN
          ALTER TABLE products ADD COLUMN cost_price INTEGER NOT NULL DEFAULT 0;
        END IF;
      END $$;
      
      -- Add total_profit column to transactions if it doesn't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='total_profit') THEN
          ALTER TABLE transactions ADD COLUMN total_profit INTEGER NOT NULL DEFAULT 0;
        END IF;
      END $$;
      
      -- Add video_url column to products if it doesn't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='video_url') THEN
          ALTER TABLE products ADD COLUMN video_url TEXT;
        END IF;
      END $$;

      -- Add order_form_fields column to tenants if it doesn't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='order_form_fields') THEN
          ALTER TABLE tenants ADD COLUMN order_form_fields JSON;
        END IF;
      END $$;

      -- Add currency columns to products
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='supplier_currency') THEN
          ALTER TABLE products ADD COLUMN supplier_currency TEXT DEFAULT 'uzs';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='supplier_currency_rate') THEN
          ALTER TABLE products ADD COLUMN supplier_currency_rate INTEGER NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='supplier_original_price') THEN
          ALTER TABLE products ADD COLUMN supplier_original_price REAL NOT NULL DEFAULT 0;
        ELSE
          ALTER TABLE products ALTER COLUMN supplier_original_price TYPE REAL USING supplier_original_price::REAL;
        END IF;
      END $$;

      -- Add unit column to products
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='unit') THEN
          ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'dona';
        END IF;
      END $$;

      -- Change stock to REAL for decimal support (litr)
      ALTER TABLE products ALTER COLUMN stock TYPE REAL USING stock::REAL;

      -- Add default_dollar_rate to tenants
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='default_dollar_rate') THEN
          ALTER TABLE tenants ADD COLUMN default_dollar_rate INTEGER NOT NULL DEFAULT 0;
        END IF;
      END $$;

      -- ============================================
      -- PERFORMANCE INDEXES (multi-tenant filtering)
      -- ============================================
      CREATE INDEX IF NOT EXISTS products_tenant_id_idx ON products(tenant_id);
      CREATE INDEX IF NOT EXISTS products_tenant_stock_idx ON products(tenant_id, stock);
      CREATE INDEX IF NOT EXISTS transactions_tenant_id_idx ON transactions(tenant_id);
      CREATE INDEX IF NOT EXISTS transactions_tenant_date_idx ON transactions(tenant_id, date DESC);
      CREATE INDEX IF NOT EXISTS orders_tenant_id_idx ON orders(tenant_id);
      CREATE INDEX IF NOT EXISTS orders_tenant_status_idx ON orders(tenant_id, status);
      CREATE INDEX IF NOT EXISTS orders_tenant_created_idx ON orders(tenant_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS categories_tenant_id_idx ON categories(tenant_id);
      CREATE INDEX IF NOT EXISTS suppliers_tenant_id_idx ON suppliers(tenant_id);
      CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON users(tenant_id);
      CREATE INDEX IF NOT EXISTS customers_tenant_id_idx ON customers(tenant_id);
      CREATE INDEX IF NOT EXISTS expense_categories_tenant_id_idx ON expense_categories(tenant_id);
      CREATE INDEX IF NOT EXISTS income_categories_tenant_id_idx ON income_categories(tenant_id);
      CREATE INDEX IF NOT EXISTS expenses_tenant_id_idx ON expenses(tenant_id);
      CREATE INDEX IF NOT EXISTS staff_members_tenant_id_idx ON staff_members(tenant_id);
      CREATE INDEX IF NOT EXISTS attendance_records_tenant_id_idx ON attendance_records(tenant_id);
      CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_idx ON audit_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS shift_handovers_tenant_id_idx ON shift_handovers(tenant_id);
      CREATE INDEX IF NOT EXISTS deliveries_tenant_id_idx ON deliveries(tenant_id);
      CREATE INDEX IF NOT EXISTS debt_payments_tenant_id_idx ON debt_payments(tenant_id);
      CREATE INDEX IF NOT EXISTS cash_register_entries_tenant_id_idx ON cash_register_entries(tenant_id);
    `);
    
    console.log("Database migrations completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  } finally {
    client.release();
  }
}
