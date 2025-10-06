-- Create leads table for storing iPhone evaluation submissions
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model TEXT NOT NULL,
  storage TEXT NOT NULL,
  battery TEXT NOT NULL,
  scratches TEXT NOT NULL,
  defects TEXT NOT NULL,
  sim TEXT NOT NULL,
  estimated_price INTEGER NOT NULL,
  sale_timeline TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert leads (public form)
CREATE POLICY "Anyone can submit leads"
ON public.leads
FOR INSERT
WITH CHECK (true);

-- Create policy for admins to view all leads
CREATE POLICY "Service role can view all leads"
ON public.leads
FOR SELECT
USING (auth.role() = 'service_role');

-- Create index for faster queries by created_at
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE public.leads IS 'Stores iPhone evaluation submissions from users';
COMMENT ON COLUMN public.leads.model IS 'iPhone model (e.g., iPhone 13, iPhone 14 Pro)';
COMMENT ON COLUMN public.leads.storage IS 'Storage capacity (e.g., 128GB, 256GB)';
COMMENT ON COLUMN public.leads.battery IS 'Battery health percentage';
COMMENT ON COLUMN public.leads.estimated_price IS 'Calculated price in rubles';
COMMENT ON COLUMN public.leads.sale_timeline IS 'When user plans to sell (today/week/later)';