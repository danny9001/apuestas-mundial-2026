-- Migration 0009: QR de pago por empresa
-- Adds: qr_url TEXT to companies (imagen QR para que los usuarios paguen la cuota escaneando)

ALTER TABLE companies ADD COLUMN IF NOT EXISTS qr_url TEXT;
