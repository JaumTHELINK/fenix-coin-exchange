-- 1. Campo de saldo pendente do lojista
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_balance numeric NOT NULL DEFAULT 0;

-- 2. Proteger pending_balance nos gatilhos financeiros (somente admin/funções internas alteram)
CREATE OR REPLACE FUNCTION public.protect_profile_financial_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    NEW.balance := OLD.balance;
    NEW.level := OLD.level;
    NEW.total_recycled_kg := OLD.total_recycled_kg;
    NEW.month_recycled_kg := OLD.month_recycled_kg;
    NEW.pending_balance := OLD.pending_balance;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_profile_financial_fields_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    NEW.balance := 0;
    NEW.level := 'Iniciante';
    NEW.total_recycled_kg := 0;
    NEW.month_recycled_kg := 0;
    NEW.pending_balance := 0;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Função de resgate de produto de loja parceira (executada pelo cliente logado)
CREATE OR REPLACE FUNCTION public.redeem_store_product(_product_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_product record;
  v_store record;
  v_client record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = _product_id;
  IF NOT FOUND OR NOT v_product.active THEN
    RAISE EXCEPTION 'Produto indisponível';
  END IF;
  IF v_product.store_id IS NULL THEN
    RAISE EXCEPTION 'Este produto não é de uma loja parceira';
  END IF;

  SELECT * INTO v_store FROM public.stores WHERE id = v_product.store_id;
  IF NOT FOUND OR NOT v_store.active THEN
    RAISE EXCEPTION 'Loja indisponível';
  END IF;
  IF v_store.owner_id = v_uid THEN
    RAISE EXCEPTION 'Você não pode resgatar produtos da sua própria loja';
  END IF;

  SELECT * INTO v_client FROM public.profiles WHERE user_id = v_uid;
  IF NOT FOUND OR NOT v_client.is_active THEN
    RAISE EXCEPTION 'Conta indisponível';
  END IF;
  IF v_client.balance < v_product.price_fc THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  -- Debita o cliente e registra transação
  UPDATE public.profiles SET balance = balance - v_product.price_fc WHERE user_id = v_uid;
  INSERT INTO public.transactions (user_id, type, amount, description, category)
  VALUES (v_uid, 'debit', v_product.price_fc, 'Resgate: ' || v_product.name || ' (' || v_store.name || ')', 'resgate');

  -- Credita o lojista como pendente
  UPDATE public.profiles SET pending_balance = pending_balance + v_product.price_fc WHERE user_id = v_store.owner_id;

  RETURN jsonb_build_object('success', true, 'amount', v_product.price_fc);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.redeem_store_product(uuid) TO authenticated;

-- 4. Função de liberação dos pendentes
CREATE OR REPLACE FUNCTION public.release_pending_earnings()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN SELECT user_id, pending_balance FROM public.profiles WHERE pending_balance > 0 LOOP
    UPDATE public.profiles
      SET balance = balance + r.pending_balance, pending_balance = 0
      WHERE user_id = r.user_id;
    INSERT INTO public.transactions (user_id, type, amount, description, category)
    VALUES (r.user_id, 'credit', r.pending_balance, 'Liberação de vendas pendentes', 'venda');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

-- 5. Detecta o 5º dia útil do mês (ignora sábados e domingos)
CREATE OR REPLACE FUNCTION public.is_fifth_business_day(_d date)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  cur date := date_trunc('month', _d)::date;
  cnt integer := 0;
BEGIN
  IF extract(dow FROM _d) IN (0,6) THEN
    RETURN false;
  END IF;
  WHILE cur <= _d LOOP
    IF extract(dow FROM cur) NOT IN (0,6) THEN
      cnt := cnt + 1;
    END IF;
    cur := cur + 1;
  END LOOP;
  RETURN cnt = 5;
END;
$function$;

-- Roda a liberação apenas se hoje for o 5º dia útil
CREATE OR REPLACE FUNCTION public.release_pending_if_due()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_fifth_business_day(current_date) THEN
    RETURN public.release_pending_earnings();
  END IF;
  RETURN 0;
END;
$function$;

-- 6. Agendamento diário
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule('release-pending-earnings-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-pending-earnings-daily');

SELECT cron.schedule(
  'release-pending-earnings-daily',
  '0 9 * * *',
  $$ SELECT public.release_pending_if_due(); $$
);