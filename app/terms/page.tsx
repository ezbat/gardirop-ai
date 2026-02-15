"use client"

import FloatingParticles from "@/components/floating-particles"
import { useLanguage } from "@/lib/language-context"

export default function TermsOfServicePage() {
  const { t, language } = useLanguage()

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="glass border border-border rounded-2xl p-8 md:p-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              {t('termsOfService')}
            </h1>
            <p className="text-muted-foreground mb-8">
              {t('lastUpdated')}: {new Date().toLocaleDateString(language === 'tr' ? 'tr-TR' : language === 'de' ? 'de-DE' : 'en-US')}
            </p>

            <div className="space-y-8 text-foreground">
              {/* 1. Kabul ve Onay */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('acceptanceOfTerms')}</h2>
                <p className="text-muted-foreground">
                  {t('acceptanceOfTermsDesc')}
                </p>
              </section>

              {/* 2. Hizmet Tanımı */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('serviceDescription')}</h2>
                <p className="text-muted-foreground mb-3">
                  {t('serviceDescriptionIntro')}
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t('onlineFashionMarketplace')}</li>
                  <li>{t('outfitRecommendations')}</li>
                  <li>{t('sellerServices')}</li>
                  <li>{t('securePayments')}</li>
                </ul>
              </section>

              {/* 3. Kullanıcı Hesapları */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('userAccounts')}</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p><strong>{t('accountCreation')}:</strong> {t('accountCreationDesc')}</p>
                  <p><strong>{t('accountSecurity')}:</strong> {t('accountSecurityDesc')}</p>
                  <p><strong>{t('accountTermination')}:</strong> {t('accountTerminationDesc')}</p>
                </div>
              </section>

              {/* 4. Satıcı Koşulları */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('sellerTerms')}</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p><strong>{t('sellerApproval')}:</strong> {t('sellerApprovalDesc')}</p>
                  <p><strong>{t('productListings')}:</strong> {t('productListingsDesc')}</p>
                  <p><strong>{t('prohibitedItems')}:</strong> {t('prohibitedItemsDesc')}</p>
                  <p><strong>{t('orderFulfillment')}:</strong> {t('orderFulfillmentDesc')}</p>
                  <p><strong>{t('sellerFees')}:</strong> {t('sellerFeesDesc')}</p>
                </div>
              </section>

              {/* 5. Sipariş ve Ödeme */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('ordersAndPayments')}</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p><strong>{t('orderPlacement')}:</strong> {t('orderPlacementDesc')}</p>
                  <p><strong>{t('pricing')}:</strong> {t('pricingDesc')}</p>
                  <p><strong>{t('paymentMethods')}:</strong> {t('paymentMethodsDesc')}</p>
                  <p><strong>{t('orderConfirmation')}:</strong> {t('orderConfirmationDesc')}</p>
                </div>
              </section>

              {/* 6. Teslimat ve İade */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('shippingAndReturns')}</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p><strong>{t('shippingPolicy')}:</strong> {t('shippingPolicyDesc')}</p>
                  <p><strong>{t('returnPolicy')}:</strong> {t('returnPolicyDesc')}</p>
                  <p><strong>{t('refunds')}:</strong> {t('refundsDesc')}</p>
                </div>
              </section>

              {/* 7. Fikri Mülkiyet */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('intellectualProperty')}</h2>
                <p className="text-muted-foreground mb-3">
                  {t('intellectualPropertyDesc')}
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t('platformContent')}</li>
                  <li>{t('userContent')}</li>
                  <li>{t('trademarks')}</li>
                </ul>
              </section>

              {/* 8. Yasak Davranışlar */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('prohibitedConduct')}</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t('violateLaws')}</li>
                  <li>{t('fraudulentActivity')}</li>
                  <li>{t('unauthorizedAccess')}</li>
                  <li>{t('spamHarassment')}</li>
                  <li>{t('maliciousSoftware')}</li>
                  <li>{t('intellectualPropertyViolation')}</li>
                </ul>
              </section>

              {/* 9. Sorumluluk Reddi */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('disclaimer')}</h2>
                <p className="text-muted-foreground">
                  {t('disclaimerDesc')}
                </p>
              </section>

              {/* 10. Sorumluluk Sınırlaması */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('limitationOfLiability')}</h2>
                <p className="text-muted-foreground">
                  {t('limitationOfLiabilityDesc')}
                </p>
              </section>

              {/* 11. Tazminat */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('indemnification')}</h2>
                <p className="text-muted-foreground">
                  {t('indemnificationDesc')}
                </p>
              </section>

              {/* 12. Uyuşmazlık Çözümü */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('disputeResolutionLegal')}</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p><strong>{t('governingLaw')}:</strong> {t('governingLawDesc')}</p>
                  <p><strong>{t('jurisdiction')}:</strong> {t('jurisdictionDesc')}</p>
                  <p><strong>{t('arbitration')}:</strong> {t('arbitrationDesc')}</p>
                </div>
              </section>

              {/* 13. Değişiklikler */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('modificationsToTerms')}</h2>
                <p className="text-muted-foreground">
                  {t('modificationsToTermsDesc')}
                </p>
              </section>

              {/* 14. Fesih */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('termination')}</h2>
                <p className="text-muted-foreground">
                  {t('terminationDesc')}
                </p>
              </section>

              {/* 15. Çeşitli Hükümler */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('miscellaneous')}</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p><strong>{t('entireAgreement')}:</strong> {t('entireAgreementDesc')}</p>
                  <p><strong>{t('severability')}:</strong> {t('severabilityDesc')}</p>
                  <p><strong>{t('waiver')}:</strong> {t('waiverDesc')}</p>
                  <p><strong>{t('assignment')}:</strong> {t('assignmentDesc')}</p>
                </div>
              </section>

              {/* 16. İletişim */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('contact')}</h2>
                <p className="text-muted-foreground mb-3">{t('contactTermsDesc')}</p>
                <div className="bg-primary/5 p-4 rounded-xl">
                  <p className="font-semibold">Wearo - {t('legalDepartment')}</p>
                  <p className="text-sm text-muted-foreground">Email: wearo.product@gmail.com</p>
                  <p className="text-sm text-muted-foreground">Email: wearo.product@gmail.com</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
