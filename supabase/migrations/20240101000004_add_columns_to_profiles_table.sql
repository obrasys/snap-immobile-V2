-- Adicionar colunas que faltam à tabela profiles
ALTER TABLE public.profiles
ADD COLUMN email TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN cpf TEXT,
ADD COLUMN company TEXT,
ADD COLUMN role TEXT,
ADD COLUMN plan TEXT DEFAULT 'free'; -- Definindo 'free' como plano padrão

-- Recriar políticas RLS para garantir que as novas colunas sejam cobertas
-- As políticas existentes já usam auth.uid() = id, o que é seguro.
-- Recriá-las garante que o Supabase as aplique corretamente ao novo esquema.

-- Recriar política SELECT
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

-- Recriar política INSERT
DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Recriar política UPDATE
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Recriar política DELETE
DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE TO authenticated USING (auth.uid() = id);