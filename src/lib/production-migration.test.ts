import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const migrationName = readdirSync(migrationsDir).find((name) => name.endsWith('_production_hardening.sql'));
if (!migrationName) throw new Error('Production hardening migration is missing');
const migration = readFileSync(join(migrationsDir, migrationName), 'utf8').toLowerCase();

describe('production database boundary', () => {
  it('uses an atomic server-side checkout function with stock locks', () => {
    expect(migration).toContain('function public.create_public_order');
    expect(migration).toContain('for update of pv');
    expect(migration).toContain('stock_quantity = stock_quantity - v_line.quantity');
  });

  it('removes direct anonymous order writes', () => {
    expect(migration).toContain('drop policy if exists "guests insert orders"');
    expect(migration).toContain('revoke all on public.orders');
  });

  it('requires authenticated admin membership for seller policies', () => {
    expect(migration).toContain('function private.is_admin');
    expect(migration).toContain('to authenticated');
    expect(migration).toContain('select private.is_admin()');
  });
});
