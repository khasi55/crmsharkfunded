-- Allow guest checkout by making user_id nullable in payment_orders table
ALTER TABLE payment_orders ALTER COLUMN user_id DROP NOT NULL;
