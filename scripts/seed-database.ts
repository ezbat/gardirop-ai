#!/usr/bin/env node

/**
 * Database Seeder - Development & Demo Data
 *
 * Bu script development ve demo için örnek veri oluşturur
 *
 * Kullanım:
 * npx tsx scripts/seed-database.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Seed data
const CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories']
const BRANDS = ['Nike', 'Adidas', 'Zara', 'H&M', 'Uniqlo', 'Gap', 'Levi\'s', 'Puma']
const COLORS = ['Black', 'White', 'Navy', 'Gray', 'Beige', 'Red', 'Blue', 'Green']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All Season']
const OCCASIONS = ['Casual', 'Business', 'Formal', 'Sport', 'Party']

async function seedUsers() {
  console.log('\n👤 Seeding Users...')

  const users = [
    {
      email: 'admin@wearo.com',
      password: 'Admin123!',
      full_name: 'Admin User',
      role: 'admin'
    },
    {
      email: 'seller1@wearo.com',
      password: 'Seller123!',
      full_name: 'Fashion Store',
      role: 'seller'
    },
    {
      email: 'seller2@wearo.com',
      password: 'Seller123!',
      full_name: 'Urban Wear',
      role: 'seller'
    },
    {
      email: 'buyer@wearo.com',
      password: 'Buyer123!',
      full_name: 'John Doe',
      role: 'buyer'
    }
  ]

  const createdUsers = []

  for (const user of users) {
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      })

      if (authError) {
        console.log(`⚠️  User ${user.email} might already exist`)
        continue
      }

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: user.full_name,
          role: user.role
        })
        .eq('id', authData.user.id)

      if (updateError) {
        console.error(`❌ Failed to update ${user.email}:`, updateError.message)
      } else {
        console.log(`✅ Created user: ${user.email}`)
        createdUsers.push({ ...user, id: authData.user.id })
      }
    } catch (error: any) {
      console.error(`❌ Error creating ${user.email}:`, error.message)
    }
  }

  return createdUsers
}

async function seedSellers(users: any[]) {
  console.log('\n🏪 Seeding Sellers...')

  const sellers = users.filter(u => u.role === 'seller')
  const createdSellers = []

  for (const seller of sellers) {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .insert({
          user_id: seller.id,
          shop_name: seller.full_name,
          description: `Welcome to ${seller.full_name}! We offer high-quality fashion items.`,
          business_email: seller.email,
          business_phone: '+1555' + Math.floor(Math.random() * 10000000),
          status: 'approved',
          commission_rate: 15.0
        })
        .select()
        .single()

      if (error) {
        console.error(`❌ Failed to create seller ${seller.email}:`, error.message)
      } else {
        console.log(`✅ Created seller: ${seller.full_name}`)
        createdSellers.push(data)
      }
    } catch (error: any) {
      console.error(`❌ Error:`, error.message)
    }
  }

  return createdSellers
}

async function seedProducts(sellers: any[]) {
  console.log('\n👕 Seeding Products...')

  const products = []
  let count = 0

  for (const seller of sellers) {
    // Her satıcı için 20 ürün
    for (let i = 0; i < 20; i++) {
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
      const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)]
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      const price = Math.floor(Math.random() * 150) + 30

      const product = {
        seller_id: seller.id,
        title: `${brand} ${category} ${color}`,
        description: `Premium ${color.toLowerCase()} ${category.toLowerCase()} from ${brand}. Made with high-quality materials for maximum comfort and style.`,
        category,
        brand,
        price,
        currency: 'USD',
        stock: Math.floor(Math.random() * 100) + 10,
        color,
        sizes: SIZES.slice(0, Math.floor(Math.random() * 4) + 3),
        images: [
          `https://placehold.co/800x1000/3B82F6/FFFFFF/png?text=${encodeURIComponent(brand + ' ' + category)}`
        ],
        status: 'approved',
        is_featured: Math.random() > 0.7
      }

      products.push(product)
    }
  }

  // Batch insert
  const { data, error } = await supabase
    .from('products')
    .insert(products)
    .select()

  if (error) {
    console.error('❌ Failed to seed products:', error.message)
    return []
  }

  console.log(`✅ Created ${data.length} products`)
  return data
}

async function seedOutfitCollections(sellers: any[], products: any[]) {
  console.log('\n👔 Seeding Outfit Collections...')

  const outfits = []

  for (const seller of sellers) {
    const sellerProducts = products.filter(p => p.seller_id === seller.id)

    // Her satıcı için 5 kombin
    for (let i = 0; i < 5; i++) {
      const season = SEASONS[Math.floor(Math.random() * SEASONS.length)]
      const occasion = OCCASIONS[Math.floor(Math.random() * OCCASIONS.length)]

      const { data: outfit, error: outfitError } = await supabase
        .from('outfit_collections')
        .insert({
          seller_id: seller.id,
          name: `${season} ${occasion} Look ${i + 1}`,
          description: `Perfect ${season.toLowerCase()} outfit for ${occasion.toLowerCase()} occasions`,
          season,
          occasion,
          style_tags: [occasion, season, 'Trendy'],
          is_active: true,
          display_order: i
        })
        .select()
        .single()

      if (outfitError) {
        console.error('❌ Failed to create outfit:', outfitError.message)
        continue
      }

      // Her kombine 3-5 ürün ekle
      const numItems = Math.floor(Math.random() * 3) + 3
      const selectedProducts = sellerProducts
        .sort(() => Math.random() - 0.5)
        .slice(0, numItems)

      const outfitItems = selectedProducts.map((product, index) => ({
        outfit_id: outfit.id,
        product_id: product.id,
        display_order: index,
        is_required: index < 2 // İlk 2 ürün required
      }))

      const { error: itemsError } = await supabase
        .from('outfit_items')
        .insert(outfitItems)

      if (itemsError) {
        console.error('❌ Failed to add outfit items:', itemsError.message)
      } else {
        outfits.push(outfit)
      }
    }
  }

  console.log(`✅ Created ${outfits.length} outfit collections`)
  return outfits
}

async function seedReviews(products: any[], users: any[]) {
  console.log('\n⭐ Seeding Product Reviews...')

  const buyers = users.filter(u => u.role === 'buyer')
  if (buyers.length === 0) {
    console.log('⚠️  No buyers found, skipping reviews')
    return
  }

  const reviews = []
  const comments = [
    'Excellent product! Highly recommend.',
    'Good quality for the price.',
    'Very comfortable and stylish.',
    'Fast shipping and great service.',
    'Perfect fit, exactly as described.',
    'Nice color and material.',
    'Will definitely buy again!',
    'Great value for money.'
  ]

  // Her ürün için 1-5 yorum
  for (const product of products.slice(0, 30)) {
    const numReviews = Math.floor(Math.random() * 5) + 1

    for (let i = 0; i < numReviews; i++) {
      const buyer = buyers[Math.floor(Math.random() * buyers.length)]
      const rating = Math.floor(Math.random() * 2) + 4 // 4-5 yıldız

      reviews.push({
        product_id: product.id,
        user_id: buyer.id,
        rating,
        comment: comments[Math.floor(Math.random() * comments.length)],
        verified_purchase: Math.random() > 0.3
      })
    }
  }

  const { data, error } = await supabase
    .from('product_reviews')
    .insert(reviews)
    .select()

  if (error) {
    console.error('❌ Failed to seed reviews:', error.message)
    return
  }

  console.log(`✅ Created ${data.length} product reviews`)
}

async function seedCoupons(sellers: any[]) {
  console.log('\n🎟️  Seeding Coupons...')

  const coupons = []

  for (const seller of sellers) {
    // Genel kupon
    coupons.push({
      code: `${seller.shop_name.toUpperCase().replace(/\s/g, '')}20`,
      type: 'percentage',
      discount_value: 20,
      min_purchase_amount: 50,
      max_discount_amount: 50,
      usage_limit: 100,
      seller_id: seller.id,
      is_active: true,
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    // Yeni müşteri kuponu
    coupons.push({
      code: `WELCOME${seller.shop_name.toUpperCase().replace(/\s/g, '').substring(0, 5)}`,
      type: 'fixed',
      discount_value: 10,
      min_purchase_amount: 30,
      usage_limit: 1,
      seller_id: seller.id,
      is_active: true,
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    })
  }

  const { data, error } = await supabase
    .from('coupons')
    .insert(coupons)
    .select()

  if (error) {
    console.error('❌ Failed to seed coupons:', error.message)
    return
  }

  console.log(`✅ Created ${data.length} coupons`)
}

async function main() {
  console.log('🌱 Starting database seeding...\n')
  console.log('⚠️  WARNING: This will create demo data in your database')
  console.log('⚠️  Only run this in development environment!\n')

  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot seed production database!')
    process.exit(1)
  }

  try {
    // 1. Users
    const users = await seedUsers()
    if (users.length === 0) {
      console.error('❌ No users created, aborting')
      process.exit(1)
    }

    // 2. Sellers
    const sellers = await seedSellers(users)
    if (sellers.length === 0) {
      console.error('❌ No sellers created, aborting')
      process.exit(1)
    }

    // 3. Products
    const products = await seedProducts(sellers)
    if (products.length === 0) {
      console.error('❌ No products created, aborting')
      process.exit(1)
    }

    // 4. Outfit Collections
    await seedOutfitCollections(sellers, products)

    // 5. Reviews
    await seedReviews(products, users)

    // 6. Coupons
    await seedCoupons(sellers)

    console.log('\n✅ Database seeding completed successfully!')
    console.log('\n📋 Test Credentials:')
    console.log('─'.repeat(60))
    console.log('Admin:  admin@wearo.com / Admin123!')
    console.log('Seller: seller1@wearo.com / Seller123!')
    console.log('Seller: seller2@wearo.com / Seller123!')
    console.log('Buyer:  buyer@wearo.com / Buyer123!')
    console.log('─'.repeat(60))

  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message)
    process.exit(1)
  }
}

main()
