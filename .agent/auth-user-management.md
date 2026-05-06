# Auth & User Management Implementation Plan

## Phase 1: Database & Supabase Schema
1. Update `supabase/schema.sql`:
   - Create custom `profiles` table linked to `auth.users` to store `username`, `role` (ADMIN/KASIR), and `name`.
   - Add `created_by` (UUID) to `transactions` and `payments` tables.
   - Set up RLS (Row Level Security) so Kasir can only insert, while Admin can insert/update/delete.
2. Update WatermelonDB Schema (`lib/db/schema.ts`):
   - Add `created_by` to `transactions` and `payments`.
   - Add `profiles` table to WatermelonDB if offline sync is needed for users, or just fetch directly.

## Phase 2: Authentication Logic (Supabase + Next.js)
1. Modify `lib/auth.tsx` to integrate with `supabase.auth.signInWithPassword`.
   - Map `username` to a dummy email behind the scenes (e.g. `[username]@toko.local`) because Supabase requires email.
   - Enforce minimum 6-digit PIN as the Supabase password for security.
2. Update `app/login/page.tsx`:
   - Form Login dengan Username dan PIN (Type password but number pad).

## Phase 3: User Management UI (Admin Only)
1. Create `app/pengaturan/users/page.tsx`:
   - List semua kasir.
   - Form tambah kasir baru (Supabase Admin API `createUser` atau function RPC).
   - Reset PIN kasir.

## Phase 4: Audit Trail Implementation
1. Update `app/bon-baru/page.tsx` and `app/pembayaran/page.tsx`:
   - Insert `created_by` based on logged-in user ID.
2. Update Laporan UI to show nama Kasir yang memproses.

