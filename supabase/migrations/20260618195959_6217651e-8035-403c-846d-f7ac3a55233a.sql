-- Permitir que funções internas (SECURITY DEFINER) atualizem campos financeiros
-- usando uma flag transacional, contornando a proteção apenas dentro da transação.

CREATE OR REPLACE FUNCTION public.protect_profile_financial_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin')
     AND COALESCE(current_setting('app.bypass_financial_protection', true), '') <> 'on' THEN
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
  IF NOT has_role(auth.uid(), 'admin')
     AND COALESCE(current_setting('app.bypass_financial_protection', true), '') <> 'on' THEN
    NEW.balance := 0;
    NEW.level := 'Iniciante';
    NEW.total_recycled_kg := 0;
    NEW.month_recycled_kg := 0;
    NEW.pending_balance := 0;
  END IF;
  RETURN NEW;
END;
$function$;

-- Resgate de produto: ativa o bypass antes de mexer em saldos
CREATE OR REPLACE FUNCTION public.redeem_store_product(_product_id uuid, _quantity integer DEFAULT 1)
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
  v_qty integer := COALESCE(_quantity, 1);
  v_total numeric;
  v_order_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF v_qty < 1 OR v_qty > 100 THEN
    RAISE EXCEPTION 'Quantidade inválida';
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

  v_total := v_product.price_fc * v_qty;

  IF v_client.balance < v_total THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  -- Habilita atualização de campos financeiros nesta transação
  PERFORM set_config('app.bypass_financial_protection', 'on', true);

  -- Debita o cliente e registra transação
  UPDATE public.profiles SET balance = balance - v_total WHERE user_id = v_uid;
  INSERT INTO public.transactions (user_id, type, amount, description, category)
  VALUES (v_uid, 'debit', v_total, 'Resgate: ' || v_qty || 'x ' || v_product.name || ' (' || v_store.name || ')', 'resgate');

  -- Credita o lojista como pendente
  UPDATE public.profiles SET pending_balance = pending_balance + v_total WHERE user_id = v_store.owner_id;

  -- Registra o pedido
  INSERT INTO public.orders (store_id, customer_id, product_id, product_name, quantity, unit_price_fc, total_fc, customer_name, customer_phone)
  VALUES (v_store.id, v_uid, v_product.id, v_product.name, v_qty, v_product.price_fc, v_total, v_client.full_name, v_client.phone)
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object('success', true, 'amount', v_total, 'quantity', v_qty, 'order_id', v_order_id);
END;
$function$;

-- Liberação de pendências também precisa do bypass
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
  PERFORM set_config('app.bypass_financial_protection', 'on', true);
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