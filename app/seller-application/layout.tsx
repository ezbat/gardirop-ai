import { SellerApplicationProvider } from '@/lib/seller-application-context'

export default function SellerApplicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <SellerApplicationProvider>
      {children}
    </SellerApplicationProvider>
  )
}
