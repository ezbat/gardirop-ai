-- Automatic Balance Updates Migration
-- Adds database triggers to automatically update seller balances when orders are paid

-- Create function to update seller balance when order transitions to PAID
CREATE OR REPLACE FUNCTION update_seller_balance_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  commission_rate DECIMAL;
  commission_amount DECIMAL;
  seller_amount DECIMAL;
  item_total DECIMAL;
BEGIN
  -- Only trigger when state changes to PAID
  IF NEW.state = 'PAID' AND (OLD.state IS NULL OR OLD.state != 'PAID') THEN

    RAISE LOG 'Order % transitioned to PAID, updating seller balances', NEW.id;

    -- Process each order item
    FOR item IN
      SELECT
        oi.*,
        COALESCE(sb.commission_rate, 15) as seller_commission_rate
      FROM order_items oi
      LEFT JOIN seller_balances sb ON sb.seller_id = oi.seller_id
      WHERE oi.order_id = NEW.id
    LOOP
      -- Calculate amounts
      commission_rate := item.seller_commission_rate;
      item_total := item.price * item.quantity;
      commission_amount := (item_total * commission_rate) / 100;
      seller_amount := item_total - commission_amount;

      RAISE LOG 'Processing item % for seller %: total=%, commission=%, seller_amount=%',
        item.id, item.seller_id, item_total, commission_amount, seller_amount;

      -- Ensure seller_balances record exists
      INSERT INTO seller_balances (seller_id, pending_balance, total_sales)
      VALUES (item.seller_id, 0, 0)
      ON CONFLICT (seller_id) DO NOTHING;

      -- Update seller pending balance and total sales
      UPDATE seller_balances
      SET
        pending_balance = pending_balance + seller_amount,
        total_sales = total_sales + item_total,
        updated_at = NOW()
      WHERE seller_id = item.seller_id;

      -- Update order_items with calculated payout info
      UPDATE order_items
      SET
        platform_commission = commission_amount,
        seller_payout_amount = seller_amount,
        seller_payout_status = 'pending'
      WHERE id = item.id;

      RAISE LOG 'Updated seller % balance: +% EUR pending', item.seller_id, seller_amount;
    END LOOP;

    -- Set escrow release time (7 days after estimated delivery)
    -- If no estimated delivery, use 14 days from now as default
    IF NEW.estimated_delivery IS NOT NULL THEN
      NEW.escrow_release_at := NEW.estimated_delivery + INTERVAL '7 days';
    ELSE
      NEW.escrow_release_at := NOW() + INTERVAL '14 days';
    END IF;

    RAISE LOG 'Escrow release scheduled for %', NEW.escrow_release_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update balances on payment
DROP TRIGGER IF EXISTS trigger_update_balance_on_payment ON orders;
CREATE TRIGGER trigger_update_balance_on_payment
BEFORE UPDATE OF state ON orders
FOR EACH ROW
EXECUTE FUNCTION update_seller_balance_on_payment();

-- Create function to handle refunds (move money from pending to refunded)
CREATE OR REPLACE FUNCTION update_seller_balance_on_refund()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  -- Only trigger when state changes to REFUNDED
  IF NEW.state = 'REFUNDED' AND (OLD.state IS NULL OR OLD.state != 'REFUNDED') THEN

    RAISE LOG 'Order % transitioned to REFUNDED, reversing seller balances', NEW.id;

    -- Process each order item
    FOR item IN
      SELECT *
      FROM order_items
      WHERE order_id = NEW.id
        AND seller_payout_status != 'completed' -- Don't reverse if already paid out
    LOOP
      -- Reverse pending balance
      UPDATE seller_balances
      SET
        pending_balance = pending_balance - COALESCE(item.seller_payout_amount, 0),
        total_sales = total_sales - (item.price * item.quantity),
        updated_at = NOW()
      WHERE seller_id = item.seller_id;

      -- Update order item status
      UPDATE order_items
      SET seller_payout_status = 'refunded'
      WHERE id = item.id;

      RAISE LOG 'Reversed seller % balance: -% EUR', item.seller_id, item.seller_payout_amount;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for refund handling
DROP TRIGGER IF EXISTS trigger_update_balance_on_refund ON orders;
CREATE TRIGGER trigger_update_balance_on_refund
BEFORE UPDATE OF state ON orders
FOR EACH ROW
EXECUTE FUNCTION update_seller_balance_on_refund();

-- Create function to move balance from pending to withdrawn on payout
CREATE OR REPLACE FUNCTION record_seller_payout()
RETURNS TRIGGER AS $$
BEGIN
  -- When seller_payout_status changes to 'completed'
  IF NEW.seller_payout_status = 'completed' AND
     (OLD.seller_payout_status IS NULL OR OLD.seller_payout_status != 'completed') THEN

    -- Record the payout completion time
    NEW.payout_completed_at := NOW();

    RAISE LOG 'Seller payout completed for item %: % EUR to seller %',
      NEW.id, NEW.seller_payout_amount, NEW.seller_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for recording payouts
DROP TRIGGER IF EXISTS trigger_record_seller_payout ON order_items;
CREATE TRIGGER trigger_record_seller_payout
BEFORE UPDATE OF seller_payout_status ON order_items
FOR EACH ROW
EXECUTE FUNCTION record_seller_payout();

-- Create a view for easy balance tracking
CREATE OR REPLACE VIEW seller_balance_summary AS
SELECT
  s.id as seller_id,
  s.shop_name,
  s.user_id,
  COALESCE(sb.pending_balance, 0) as pending_balance,
  COALESCE(sb.available_balance, 0) as available_balance,
  COALESCE(sb.total_withdrawn, 0) as total_withdrawn,
  COALESCE(sb.total_sales, 0) as total_sales,
  COALESCE(sb.commission_rate, 15) as commission_rate,
  (
    SELECT COUNT(*)
    FROM order_items oi
    WHERE oi.seller_id = s.id
      AND oi.seller_payout_status = 'pending'
  ) as pending_orders_count,
  (
    SELECT SUM(oi.seller_payout_amount)
    FROM order_items oi
    WHERE oi.seller_id = s.id
      AND oi.seller_payout_status = 'pending'
  ) as pending_payout_total,
  sb.last_payout_at,
  sb.updated_at as balance_updated_at
FROM sellers s
LEFT JOIN seller_balances sb ON sb.seller_id = s.id
WHERE s.status = 'approved';

-- Add comments for documentation
COMMENT ON FUNCTION update_seller_balance_on_payment() IS
'Automatically updates seller balances when an order is paid. Calculates commission and adds pending balance.';

COMMENT ON FUNCTION update_seller_balance_on_refund() IS
'Reverses seller balance changes when an order is refunded.';

COMMENT ON FUNCTION record_seller_payout() IS
'Records timestamp when a seller payout is completed.';

COMMENT ON VIEW seller_balance_summary IS
'Comprehensive view of seller balances including pending payouts and statistics.';

-- Create index for efficient escrow queries
CREATE INDEX IF NOT EXISTS idx_orders_escrow_pending ON orders(escrow_release_at, state)
WHERE state IN ('DELIVERED', 'PAID');

-- Grant permissions for the view
GRANT SELECT ON seller_balance_summary TO authenticated;
