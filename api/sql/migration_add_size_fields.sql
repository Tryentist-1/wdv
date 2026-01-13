-- Migration: Add shirt_size, pant_size, and hat_size columns to archers table
-- Date: 2026-01-13
-- Purpose: Support shirt size, pant size, and hat size fields for archer profiles

ALTER TABLE archers
  ADD COLUMN IF NOT EXISTS shirt_size VARCHAR(10) NULL COMMENT 'Shirt size (S, M, L, XL, 2X, 3X, XS)' AFTER var_pr,
  ADD COLUMN IF NOT EXISTS pant_size VARCHAR(10) NULL COMMENT 'Pant size' AFTER shirt_size,
  ADD COLUMN IF NOT EXISTS hat_size VARCHAR(10) NULL COMMENT 'Hat size' AFTER pant_size;
