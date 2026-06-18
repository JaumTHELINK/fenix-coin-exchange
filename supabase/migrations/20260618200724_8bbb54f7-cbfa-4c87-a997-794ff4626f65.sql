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

  -- Habilita atualização de campos financeiros nesta transação
  PERFORM set_config('app.bypass_financial_protection', 'on', true);

  -- Estorna o valor ao cliente
  UPDATE public.profiles SET balance = balance + v_order.total_fc WHERE user_id = v_order.customer_id;
  INSERT INTO public.transactions (user_id, type, amount, description, category)
  VALUES (v_order.customer_id, 'credit', v_order.total_fc,
          'Estorno: ' || v_order.quantity || 'x ' || v_order.product_name || ' (' || v_store.name || ')', 'estorno');

  -- Reverte o valor pendente do lojista
  UPDATE public.profiles
    SET pending_balance = GREATEST(pending_balance - v_order.total_fc, 0)
    WHERE user_id = v_store.owner_id;

  -- Marca o pedido como cancelado
  UPDATE public.orders SET status = 'cancelado' WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'refunded', v_order.total_fc);
END;
$function$;