-- 1. Remove a sobrecarga antiga e insegura (sem quantidade, sem pedido, sem bypass controlado)
DROP FUNCTION IF EXISTS public.redeem_store_product(uuid);

-- 2. Recria a função de resgate com trava de linha (FOR UPDATE) para eliminar double-spend
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
  v_new_balance numeric;
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

  -- Trava a linha do cliente até o fim da transação: resgates concorrentes
  -- passam a ser serializados, impedindo gasto duplo do mesmo saldo.
  SELECT * INTO v_client FROM public.profiles WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND OR NOT v_client.is_active THEN
    RAISE EXCEPTION 'Conta indisponível';
  END IF;

  v_total := v_product.price_fc * v_qty;

  IF v_client.balance < v_total THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  PERFORM set_config('app.bypass_financial_protection', 'on', true);

  UPDATE public.profiles
    SET balance = balance - v_total
    WHERE user_id = v_uid
    RETURNING balance INTO v_new_balance;

  -- Defesa em profundidade: nunca deixa o saldo ficar negativo
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, description, category)
  VALUES (v_uid, 'debit', v_total, 'Resgate: ' || v_qty || 'x ' || v_product.name || ' (' || v_store.name || ')', 'resgate');

  UPDATE public.profiles
    SET pending_balance = pending_balance + v_total
    WHERE user_id = v_store.owner_id;

  INSERT INTO public.orders (store_id, customer_id, product_id, product_name, quantity, unit_price_fc, total_fc, customer_name, customer_phone)
  VALUES (v_store.id, v_uid, v_product.id, v_product.name, v_qty, v_product.price_fc, v_total, v_client.full_name, v_client.phone)
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object('success', true, 'amount', v_total, 'quantity', v_qty, 'order_id', v_order_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.redeem_store_product(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_store_product(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_store_product(uuid, integer) TO authenticated;

-- 3. Trava também o cancelamento/estorno (evita estorno duplicado concorrente)
CREATE OR REPLACE FUNCTION public.cancel_store_order(_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_order record;
  v_store record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  SELECT * INTO v_store FROM public.stores WHERE id = v_order.store_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja não encontrada';
  END IF;

  IF v_store.owner_id <> v_uid AND NOT has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Sem permissão para cancelar este pedido';
  END IF;

  IF v_order.status <> 'pendente' THEN
    RAISE EXCEPTION 'Apenas pedidos pendentes podem ser cancelados';
  END IF;

  PERFORM set_config('app.bypass_financial_protection', 'on', true);

  PERFORM 1 FROM public.profiles WHERE user_id = v_order.customer_id FOR UPDATE;

  UPDATE public.profiles SET balance = balance + v_order.total_fc WHERE user_id = v_order.customer_id;
  INSERT INTO public.transactions (user_id, type, amount, description, category)
  VALUES (v_order.customer_id, 'credit', v_order.total_fc,
          'Estorno: ' || v_order.quantity || 'x ' || v_order.product_name || ' (' || v_store.name || ')', 'estorno');

  UPDATE public.profiles
    SET pending_balance = GREATEST(pending_balance - v_order.total_fc, 0)
    WHERE user_id = v_store.owner_id;

  UPDATE public.orders SET status = 'cancelado' WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'refunded', v_order.total_fc);
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_store_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_store_order(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_store_order(uuid) TO authenticated;