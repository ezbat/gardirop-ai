-- ================================================
-- CUSTOMER-SELLER CHAT SYSTEM MIGRATION
-- Copy and paste this entire file into Supabase SQL Editor
-- ================================================

-- 1. Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  last_message TEXT DEFAULT 'Yeni sohbet',
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_unread_count INTEGER DEFAULT 0,
  seller_unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: one conversation per customer-seller-product combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique
ON conversations(customer_id, seller_id, COALESCE(product_id::text, 'none'));

-- 2. Conversation messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'seller')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Quick questions table
CREATE TABLE IF NOT EXISTS quick_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Insert default quick questions
INSERT INTO quick_questions (question_text, category, order_index)
VALUES
  ('Bu ürün stokta var mı?', 'product', 1),
  ('Ürün ne zaman kargoya verilir?', 'shipping', 2),
  ('Farklı beden mevcut mu?', 'product', 3),
  ('İade şartları nelerdir?', 'return', 4),
  ('Ürünün malzemesi nedir?', 'product', 5),
  ('Kargo ücreti ne kadar?', 'shipping', 6),
  ('Ürün fotoğrafları gerçek mi?', 'product', 7),
  ('Toplu alımda indirim var mı?', 'general', 8),
  ('Ürün nasıl yıkanmalı?', 'product', 9),
  ('Değişim yapılabiliyor mu?', 'return', 10)
ON CONFLICT DO NOTHING;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_product ON conversations(product_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_sender ON conversation_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_created ON conversation_messages(created_at DESC);

-- 6. Function to update conversation's last message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message = NEW.message,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at,
    customer_unread_count = CASE
      WHEN NEW.sender_type = 'seller' THEN customer_unread_count + 1
      ELSE customer_unread_count
    END,
    seller_unread_count = CASE
      WHEN NEW.sender_type = 'customer' THEN seller_unread_count + 1
      ELSE seller_unread_count
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger to update conversation when new message sent
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON conversation_messages;
CREATE TRIGGER trigger_update_conversation_last_message
AFTER INSERT ON conversation_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message();

-- 8. Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_conversation_id UUID,
  p_reader_type VARCHAR(20)
)
RETURNS void AS $$
BEGIN
  UPDATE conversation_messages
  SET is_read = TRUE
  WHERE conversation_id = p_conversation_id
    AND sender_type != p_reader_type
    AND is_read = FALSE;

  IF p_reader_type = 'customer' THEN
    UPDATE conversations
    SET customer_unread_count = 0
    WHERE id = p_conversation_id;
  ELSE
    UPDATE conversations
    SET seller_unread_count = 0
    WHERE id = p_conversation_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- MIGRATION COMPLETE!
-- Tables created: conversations, conversation_messages, quick_questions
-- ================================================
