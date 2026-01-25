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
    `);
    
    console.log("Database migrations completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  } finally {
    client.release();
  }
}
