-- Add cycles column to leads table for iPhone 15+ models
ALTER TABLE public.leads 
ADD COLUMN cycles text;