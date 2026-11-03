-- Widen scale without reducing the existing integer range or losing stored digits.
-- Existing records, ownership policies and constraints are preserved. Safe to rerun.
begin;
alter table public.simulations alter column original_kwh type numeric(15,6);
alter table public.simulations alter column simulated_kwh type numeric(15,6);
commit;
