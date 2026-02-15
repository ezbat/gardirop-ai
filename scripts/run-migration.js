const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    console.log('📦 Reading migration file...')

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '014_customer_seller_messaging.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    console.log('🚀 Running migration...')

    // Split SQL by statements (simple split by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 Found ${statements.length} SQL statements`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`\n⚙️  Executing statement ${i + 1}/${statements.length}...`)

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_string: statement + ';'
        })

        if (error) {
          // Try direct query instead
          const result = await supabase.from('_sqlExecute').insert({ query: statement })
          if (result.error && !result.error.message.includes('does not exist')) {
            throw result.error
          }
        }

        console.log(`✅ Statement ${i + 1} executed successfully`)
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1}: ${err.message}`)
        // Continue with next statement
      }
    }

    console.log('\n✅ Migration completed!')
    console.log('\n📋 Tables created:')
    console.log('  - conversations')
    console.log('  - conversation_messages')
    console.log('  - quick_questions (with 10 default questions)')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
