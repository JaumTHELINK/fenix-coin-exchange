-- Status enum
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pendente', 'separacao', 'enviado', 'entregue', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Orders table
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_fc numeric NOT NULL DEFAULT 0,
  total_fc numeric NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pendente',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Customer can see their own orders
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

-- Store owner can see their store's orders
CREATE POLICY "Store owners can view their store orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.owns_store(auth.uid(), store_id));

-- Admin can see all orders
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Store owner can update their store's orders (e.g. status)
CREATE POLICY "Store owners can update their store orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.owns_store(auth.uid(), store_id))
  WITH CHECK (public.owns_store(auth.uid(), store_id));

-- Admin can update all orders
CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update redeem function to also create an order
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

  -- Debita o cliente e registra transação
  UPDATE public.profiles SET balance = balance - v_total WHERE user_id = v_uid;
  INSERT INTO public.transactions (user_id, type, amount, description, category)
  VALUES (v_uid, 'debit', v_total, 'Resgate: ' || v_qty || 'x ' || v_product.name || ' (' || v_store.name || ')', 'resgate');

  -- Credita o lojista como pendente
  UPDATE public.profiles SET pending_balance = pending_balance + v_total WHERE user_id = v_store.owner_id;

  -- Registra o pedido
  INSERT INTO public.orders (store_id, customer_id, product_id, product_name, quantity, unit_price_fc, total_fc)
  VALUES (v_store.id, v_uid, v_product.id, v_product.name, v_qty, v_product.price_fc, v_total)
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object('success', true, 'amount', v_total, 'quantity', v_qty, 'order_id', v_order_id);
END;
$function$;