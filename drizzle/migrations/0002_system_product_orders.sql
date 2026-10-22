CREATE TABLE public.system_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id uuid NOT NULL,
 product_id uuid REFERENCES public.products(id),
 product_name text NOT NULL,
 quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100),
 unit_price_fc numeric NOT NULL CHECK (unit_price_fc >= 0),
 total_fc numeric NOT NULL CHECK (total_fc >= 0),
 status public.order_status NOT NULL DEFAULT 'pendente',
 customer_name text,
 customer_phone text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_orders TO authenticated;
GRANT ALL ON public.system_orders TO service_role;
ALTER TABLE public.system_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own system orders" ON public.system_orders FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Admins read system orders" ON public.system_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX system_orders_created_at_idx ON public.system_orders(created_at DESC);
CREATE INDEX system_orders_customer_idx ON public.system_orders(customer_id);
CREATE TRIGGER system_orders_updated_at BEFORE UPDATE ON public.system_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.redeem_system_product(_product_id uuid, _quantity integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 v_uid uuid := auth.uid();
 v_product public.products%ROWTYPE;
 v_client public.profiles%ROWTYPE;
 v_qty integer := COALESCE(_quantity, 1);
 v_total numeric;
 v_order_id uuid;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;
 IF v_qty < 1 OR v_qty > 100 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
 SELECT * INTO v_product FROM public.products WHERE id = _product_id FOR UPDATE;
 IF NOT FOUND OR NOT v_product.active THEN RAISE EXCEPTION 'Produto indisponível'; END IF;
 IF v_product.store_id IS NOT NULL THEN RAISE EXCEPTION 'Este produto é de uma loja parceira'; END IF;
 IF v_product.price_fc < 0 THEN RAISE EXCEPTION 'Preço inválido'; END IF;
 IF v_product.stock IS NOT NULL AND v_product.stock < v_qty THEN RAISE EXCEPTION 'Estoque insuficiente'; END IF;
 SELECT * INTO v_client FROM public.profiles WHERE user_id = v_uid FOR UPDATE;
 IF NOT FOUND OR NOT v_client.is_active THEN RAISE EXCEPTION 'Conta indisponível'; END IF;
 v_total := v_product.price_fc * v_qty;
 IF v_client.balance < v_total THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
 PERFORM set_config('app.bypass_financial_protection', 'on', true);
 UPDATE public.profiles SET balance = balance - v_total WHERE user_id = v_uid;
 UPDATE public.products SET stock = stock - v_qty WHERE id = v_product.id AND stock IS NOT NULL;
 INSERT INTO public.transactions (user_id, type, amount, description, category)
 VALUES (v_uid, 'debit', v_total, 'Resgate: ' || v_qty || 'x ' || v_product.name || ' (Loja Ecoteiner)', 'resgate');
 INSERT INTO public.system_orders (customer_id, product_id, product_name, quantity, unit_price_fc, total_fc, customer_name, customer_phone)
 VALUES (v_uid, v_product.id, v_product.name, v_qty, v_product.price_fc, v_total, v_client.full_name, v_client.phone)
 RETURNING id INTO v_order_id;
 RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'amount', v_total, 'quantity', v_qty);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.redeem_system_product(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.redeem_system_product(uuid, integer) TO authenticated;

CREATE FUNCTION public.process_system_order(_order_id uuid, _status public.order_status)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 v_uid uuid := auth.uid();
 v_order public.system_orders%ROWTYPE;
BEGIN
 IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_uid AND is_active) THEN
  RAISE EXCEPTION 'Sem permissão para gerenciar este pedido';
 END IF;
 IF _status IS NULL OR _status NOT IN ('entregue', 'cancelado') THEN RAISE EXCEPTION 'Status inválido'; END IF;
 SELECT * INTO v_order FROM public.system_orders WHERE id = _order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
 IF v_order.status <> 'pendente' THEN RAISE EXCEPTION 'Apenas pedidos pendentes podem ser aprovados ou cancelados'; END IF;
 IF _status = 'cancelado' THEN
  -- Same product -> customer lock order as redemption prevents deadlocks.
  PERFORM 1 FROM public.products WHERE id = v_order.product_id FOR UPDATE;
  PERFORM 1 FROM public.profiles WHERE user_id = v_order.customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
  PERFORM set_config('app.bypass_financial_protection', 'on', true);
  UPDATE public.profiles SET balance = balance + v_order.total_fc WHERE user_id = v_order.customer_id;
  UPDATE public.products SET stock = stock + v_order.quantity WHERE id = v_order.product_id AND stock IS NOT NULL;
  INSERT INTO public.transactions (user_id, type, amount, description, category)
  VALUES (v_order.customer_id, 'credit', v_order.total_fc, 'Estorno: ' || v_order.quantity || 'x ' || v_order.product_name || ' (Loja Ecoteiner)', 'estorno');
 END IF;
 UPDATE public.system_orders SET status = _status WHERE id = v_order.id;
 RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'status', _status, 'refunded', CASE WHEN _status = 'cancelado' THEN v_order.total_fc ELSE 0 END);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.process_system_order(uuid, public.order_status) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.process_system_order(uuid, public.order_status) TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_old_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer; v_system_count integer;
BEGIN
 WITH deleted AS (DELETE FROM public.orders WHERE created_at < now() - interval '2 years' RETURNING 1) SELECT count(*) INTO v_count FROM deleted;
 WITH deleted AS (DELETE FROM public.system_orders WHERE created_at < now() - interval '2 years' RETURNING 1) SELECT count(*) INTO v_system_count FROM deleted;
 RETURN v_count + v_system_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_orders() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_orders() TO service_role;