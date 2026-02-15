-- Add tracking status columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(255),
ADD COLUMN IF NOT EXISTS tracking_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS tracking_last_update TIMESTAMP,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- Add index for cron job performance
CREATE INDEX IF NOT EXISTS idx_orders_tracking
ON orders(state, tracking_number)
WHERE state = 'SHIPPED' AND tracking_number IS NOT NULL;

-- Add comment
COMMENT ON COLUMN orders.tracking_status IS 'Latest tracking status from carrier API';
COMMENT ON COLUMN orders.tracking_location IS 'Current location from carrier tracking';
COMMENT ON COLUMN orders.tracking_last_update IS 'Last time tracking was updated';
COMMENT ON COLUMN orders.delivered_at IS 'Timestamp when order was delivered';
