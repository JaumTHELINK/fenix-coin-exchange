create or replace function public.redeem_system_product(_product_id uuid, _quantity integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_uid uuid := auth.uid();
  v_product record;
  v_client record;
  v_qty integer := COALESCE(_quantity, 1);
  v_total numeric;
  v_new_balance numeric;
  v_new_stock integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF v_qty < 1 OR v_qty > 100 THEN
    RAISE EXCEPTION 'Quantidade inválida';
  END IF;

  -- Trava a linha do produto: impede resgates concorrentes de furarem o estoque.
  SELECT * INTO v_product FROM public.products WHERE id = _product_id FOR UPDATE;
  IF NOT FOUND OR NOT v_product.active THEN
    RAISE EXCEPTION 'Produto indisponível';
  END IF;
  IF v_product.store_id IS NOT NULL THEN
    RAISE EXCEPTION 'Este produto é de uma loja parceira';
  END IF;

  IF v_product.stock IS NOT NULL THEN
    IF v_product.stock <= 0 THEN
      RAISE EXCEPTION 'Produto esgotado';
    END IF;
    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Estoque insuficiente: apenas % disponível(is)', v_product.stock;
    END IF;
  END IF;

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

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  IF v_product.stock IS NOT NULL THEN
    UPDATE public.products
      SET stock = stock - v_qty
      WHERE id = v_product.id
      RETURNING stock INTO v_new_stock;
    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'Estoque insuficiente';
    END IF;
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, description, category)
  VALUES (v_uid, 'debit', v_total, 'Resgate: ' || v_qty || 'x ' || v_product.name || ' (Loja Ecoteiner)', 'resgate');

  RETURN jsonb_build_object('success', true, 'amount', v_total, 'quantity', v_qty);
END;
$$;

revoke execute on function public.redeem_system_product(uuid, integer) from anon, public;
grant execute on function public.redeem_system_product(uuid, integer) to authenticated;