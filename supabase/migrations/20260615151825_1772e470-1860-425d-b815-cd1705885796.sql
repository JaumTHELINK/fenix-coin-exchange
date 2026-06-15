-- Tabela de lojas parceiras
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  category TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário logado vê lojas ativas
CREATE POLICY "Authenticated can view active stores"
ON public.stores FOR SELECT TO authenticated
USING (active = true);

-- Lojista vê a própria loja (mesmo inativa)
CREATE POLICY "Owners can view own store"
ON public.stores FOR SELECT TO authenticated
USING (auth.uid() = owner_id);

-- Lojista edita a própria loja
CREATE POLICY "Owners can update own store"
ON public.stores FOR UPDATE TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Admin gerencia todas as lojas
CREATE POLICY "Admins can view all stores"
ON public.stores FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert stores"
ON public.stores FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all stores"
ON public.stores FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete stores"
ON public.stores FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função auxiliar: verifica se o usuário é dono de uma loja
CREATE OR REPLACE FUNCTION public.owns_store(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = _store_id AND owner_id = _user_id
  )
$$;

-- Vincular produtos a lojas
ALTER TABLE public.products
ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Políticas de produtos para lojistas (próprios produtos)
CREATE POLICY "Owners can insert own store products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (store_id IS NOT NULL AND public.owns_store(auth.uid(), store_id));

CREATE POLICY "Owners can update own store products"
ON public.products FOR UPDATE TO authenticated
USING (store_id IS NOT NULL AND public.owns_store(auth.uid(), store_id))
WITH CHECK (store_id IS NOT NULL AND public.owns_store(auth.uid(), store_id));

CREATE POLICY "Owners can view own store products"
ON public.products FOR SELECT TO authenticated
USING (store_id IS NOT NULL AND public.owns_store(auth.uid(), store_id));