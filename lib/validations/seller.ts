import { z } from 'zod'

// ─── Seller Application ─────────────────────────────────
export const sellerApplicationSchema = z.object({
  shop_name: z.string().min(2).max(100).trim(),
  shop_description: z.string().min(10).max(2000).trim(),
  business_type: z.enum(['individual', 'company']),
  tax_number: z.string().min(5).max(50).optional(),
  phone: z.string().regex(/^\+?[\d\s\-()]{7,20}$/, 'Ungültige Telefonnummer'),
  address: z.string().min(5).max(200).trim(),
  city: z.string().min(2).max(100).trim(),
  postal_code: z.string().min(3).max(10).trim(),
  country: z.string().length(2).default('DE'),
})

export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>

// ─── Product Creation ────────────────────────────────────
export const productCreateSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(5000).trim(),
  price: z.number().positive().max(99999),
  original_price: z.number().positive().max(99999).optional(),
  category: z.string().min(1).max(100),
  brand: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  sizes: z.array(z.string()).min(1).max(20),
  stock_quantity: z.number().int().min(0).max(99999),
  images: z.array(z.string().url()).min(1).max(10),
})

export type ProductCreateInput = z.infer<typeof productCreateSchema>

// ─── Order Status Update ─────────────────────────────────
export const orderStatusUpdateSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum([
    'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED',
    'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'
  ]),
  trackingNumber: z.string().max(100).optional(),
  trackingUrl: z.string().url().optional(),
})

export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>

// ─── Withdrawal Request ──────────────────────────────────
export const withdrawalRequestSchema = z.object({
  amount: z.number().positive().min(10, 'Mindestens €10,00'),
  method: z.enum(['bank', 'paypal']),
})

export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>

// ─── Seller Settings ─────────────────────────────────────
export const sellerSettingsSchema = z.object({
  shop_name: z.string().min(2).max(100).trim().optional(),
  shop_description: z.string().max(2000).trim().optional(),
  phone: z.string().regex(/^\+?[\d\s\-()]{7,20}$/).optional(),
  bank_name: z.string().max(100).optional(),
  account_holder: z.string().max(100).optional(),
  iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/, 'Ungültige IBAN').optional(),
  paypal_email: z.string().email().optional(),
})

export type SellerSettingsInput = z.infer<typeof sellerSettingsSchema>

// ─── Store Customization ─────────────────────────────────
export const storeThemeSchema = z.object({
  storeBackground: z.enum(['white', 'lightGray', 'beige']).default('white'),
  primaryColor: z.enum([
    'purple', 'blue', 'green', 'red', 'orange', 'pink', 'teal', 'indigo'
  ]).default('purple'),
  secondaryColor: z.enum([
    'gray', 'slate', 'zinc', 'neutral', 'stone'
  ]).default('gray'),
  productCardStyle: z.enum(['minimal', 'shadow', 'bordered']).default('minimal'),
  productCardBackground: z.enum(['white', 'softGray']).default('white'),
  layoutStyle: z.enum(['grid', 'compact', 'premium']).default('grid'),
})

export type StoreThemeInput = z.infer<typeof storeThemeSchema>

// ─── Campaign Creation ───────────────────────────────────
export const campaignCreateSchema = z.object({
  name: z.string().min(3).max(100).trim(),
  budget: z.number().positive().min(10),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  productIds: z.array(z.string().uuid()).min(1).max(50),
  type: z.enum(['discount', 'flash_sale', 'seasonal', 'sponsored']),
  discountPercent: z.number().min(0).max(90).optional(),
})

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>
