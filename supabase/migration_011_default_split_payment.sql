-- Make Split the default for newly created game records.
alter table public.games
  alter column discard_payment_mode set default 'DISCARDER_FULL_OTHERS_HALF';
