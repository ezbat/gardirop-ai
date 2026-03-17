import { NextRequest, NextResponse } from 'next/server'
import { runAllFinancialTests } from '@/lib/financial-test-engine'

/**
 * GET /api/system/financial-tests
 *
 * Runs all 8 financial integrity scenarios and returns a full report.
 * Only accessible in development or with admin auth.
 */
export async function GET(request: NextRequest) {
  // Safety: only allow in development or with secret key
  const authKey = request.headers.get('x-test-key') || request.nextUrl.searchParams.get('key')
  const isDev = process.env.NODE_ENV === 'development'

  if (!isDev && authKey !== process.env.FINANCIAL_TEST_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const report = await runAllFinancialTests()

    return NextResponse.json(report, {
      status: report.summary.failed > 0 ? 422 : 200,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Test execution failed', message: error.message },
      { status: 500 }
    )
  }
}
