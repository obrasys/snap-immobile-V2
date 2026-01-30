CREATE TABLE public.properties (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their own properties." ON public.properties
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create properties." ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own properties." ON public.properties
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own properties." ON public.properties
  FOR DELETE USING (auth.uid() = user_id);