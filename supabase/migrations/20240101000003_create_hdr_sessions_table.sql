CREATE TABLE public.hdr_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES public.properties ON DELETE CASCADE NOT NULL,
  images_count integer NOT NULL,
  hdr_image_data_url text,
  status text DEFAULT 'processing'::text NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  mode text
);

ALTER TABLE public.hdr_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their own HDR sessions." ON public.hdr_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create HDR sessions." ON public.hdr_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own HDR sessions." ON public.hdr_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own HDR sessions." ON public.hdr_sessions
  FOR DELETE USING (auth.uid() = user_id);