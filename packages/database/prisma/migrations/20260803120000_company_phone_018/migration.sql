-- Spec 018: telefone comercial da empresa
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
