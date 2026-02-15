#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔍 Checking Production Readiness...\n')

let errors = 0
let warnings = 0

// Check environment variables
console.log('📋 Environment Variables Check')
console.log('─'.repeat(50))

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
]

const optionalEnvVars = [
  'OPENAI_API_KEY',
  'SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASSWORD'
]

const envPath = path.join(process.cwd(), '.env.local')
let envVars = {}

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      envVars[key.trim()] = value.trim()
    }
  })
} else {
  console.log('❌ .env.local file not found!')
  errors++
}

requiredEnvVars.forEach(envVar => {
  if (envVars[envVar] && envVars[envVar] !== 'your_' + envVar.toLowerCase()) {
    console.log(`✅ ${envVar}`)
  } else {
    console.log(`❌ ${envVar} - MISSING OR NOT CONFIGURED`)
    errors++
  }
})

console.log('\n📋 Optional Environment Variables')
console.log('─'.repeat(50))

optionalEnvVars.forEach(envVar => {
  if (envVars[envVar] && envVars[envVar] !== 'your_' + envVar.toLowerCase()) {
    console.log(`✅ ${envVar}`)
  } else {
    console.log(`⚠️  ${envVar} - Not configured (optional)`)
    warnings++
  }
})

// Check package.json scripts
console.log('\n📦 Package.json Scripts Check')
console.log('─'.repeat(50))

const packageJsonPath = path.join(process.cwd(), 'package.json')
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const requiredScripts = ['dev', 'build', 'start', 'lint']

  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`✅ ${script} script exists`)
    } else {
      console.log(`❌ ${script} script missing`)
      errors++
    }
  })
} else {
  console.log('❌ package.json not found!')
  errors++
}

// Check critical files
console.log('\n📄 Critical Files Check')
console.log('─'.repeat(50))

const criticalFiles = [
  'next.config.ts',
  'tailwind.config.ts',
  'tsconfig.json',
  '.gitignore',
  'public/robots.txt',
  'app/sitemap.ts'
]

criticalFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`⚠️  ${file} - missing`)
    warnings++
  }
})

// Check migrations
console.log('\n🗄️  Database Migrations Check')
console.log('─'.repeat(50))

const migrationsPath = path.join(process.cwd(), 'supabase', 'migrations')
if (fs.existsSync(migrationsPath)) {
  const migrations = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'))
  console.log(`✅ Found ${migrations.length} migration files`)
  migrations.forEach(migration => {
    console.log(`   - ${migration}`)
  })
} else {
  console.log('⚠️  No migrations directory found')
  warnings++
}

// Check security
console.log('\n🔒 Security Check')
console.log('─'.repeat(50))

// Check if .env files are in .gitignore
const gitignorePath = path.join(process.cwd(), '.gitignore')
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
  if (gitignoreContent.includes('.env')) {
    console.log('✅ .env files are gitignored')
  } else {
    console.log('❌ .env files NOT gitignored - SECURITY RISK!')
    errors++
  }
} else {
  console.log('⚠️  .gitignore file not found')
  warnings++
}

// Check for exposed secrets
const dangerousFiles = ['.env.local', '.env.production']
dangerousFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} exists - ensure it's NOT committed to git`)
  }
})

// Check API rate limiting
console.log('\n⚡ Performance & Security Features Check')
console.log('─'.repeat(50))

const rateLimitPath = path.join(process.cwd(), 'lib', 'rate-limit.ts')
if (fs.existsSync(rateLimitPath)) {
  console.log('✅ Rate limiting implemented')
} else {
  console.log('⚠️  Rate limiting not found')
  warnings++
}

const errorLoggerPath = path.join(process.cwd(), 'lib', 'error-logger.ts')
if (fs.existsSync(errorLoggerPath)) {
  console.log('✅ Error logging configured')
} else {
  console.log('⚠️  Error logging not found')
  warnings++
}

// Summary
console.log('\n' + '='.repeat(50))
console.log('📊 Summary')
console.log('='.repeat(50))

if (errors === 0 && warnings === 0) {
  console.log('✅ All checks passed! Ready for production.')
  process.exit(0)
} else if (errors === 0) {
  console.log(`⚠️  ${warnings} warning(s) found. Consider fixing before deploying.`)
  process.exit(0)
} else {
  console.log(`❌ ${errors} error(s) and ${warnings} warning(s) found.`)
  console.log('Please fix errors before deploying to production.')
  process.exit(1)
}
