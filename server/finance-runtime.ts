import { pool } from './db';
import { FinanceService } from './finance-service';
export const finance = new FinanceService(pool);
