"use client"

import FloatingParticles from "@/components/floating-particles"
import { useLanguage } from "@/lib/language-context"

export default function PrivacyPolicyPage() {
  const { t, language } = useLanguage()

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="glass border border-border rounded-2xl p-8 md:p-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              {t('privacyPolicy')}
            </h1>
            <p className="text-muted-foreground mb-8">
              {t('lastUpdated')}: {new Date().toLocaleDateString(language === 'tr' ? 'tr-TR' : language === 'de' ? 'de-DE' : 'en-US')}
            </p>

            <div className="space-y-8 text-foreground">
              {/* 1. Veri Sorumlusu */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('dataController')}</h2>
                <p className="mb-3">
                  {language === 'tr' && (
                    <>
                      Wearo olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve AB Genel Veri Koruma Yönetmeliği ("GDPR") kapsamında veri sorumlusu sıfatıyla hareket etmekteyiz.
                    </>
                  )}
                  {language === 'en' && (
                    <>
                      As Wearo, we act as a data controller under the Turkish Personal Data Protection Law No. 6698 ("KVKK") and the EU General Data Protection Regulation ("GDPR").
                    </>
                  )}
                  {language === 'de' && (
                    <>
                      Als Wearo handeln wir als Datenverantwortlicher gemäß dem türkischen Datenschutzgesetz Nr. 6698 ("KVKK") und der EU-Datenschutz-Grundverordnung ("DSGVO").
                    </>
                  )}
                </p>
                <div className="bg-primary/5 p-4 rounded-xl">
                  <p className="font-semibold">Wearo</p>
                  <p className="text-sm text-muted-foreground">Email: privacy@wearo.com</p>
                  <p className="text-sm text-muted-foreground">Web: www.wearo.com</p>
                </div>
              </section>

              {/* 2. Toplanan Veriler */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('dataWeCollect')}</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{t('accountInformation')}</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>{t('nameEmailPhone')}</li>
                      <li>{t('profilePictureOptional')}</li>
                      <li>{t('authenticationData')}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">{t('orderInformation')}</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>{t('shippingAddress')}</li>
                      <li>{t('orderHistory')}</li>
                      <li>{t('paymentInformation')}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">{t('usageData')}</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>{t('ipAddress')}</li>
                      <li>{t('browserType')}</li>
                      <li>{t('pagesVisited')}</li>
                      <li>{t('clickBehavior')}</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 3. Verilerin Kullanım Amaçları */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('howWeUseData')}</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t('processOrders')}</li>
                  <li>{t('customerSupport')}</li>
                  <li>{t('sendNotifications')}</li>
                  <li>{t('improveServices')}</li>
                  <li>{t('preventFraud')}</li>
                  <li>{t('marketingWithConsent')}</li>
                </ul>
              </section>

              {/* 4. Yasal Dayanak */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('legalBasis')}</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>{t('contractPerformance')}:</strong> {t('contractPerformanceDesc')}</li>
                  <li><strong>{t('legalObligation')}:</strong> {t('legalObligationDesc')}</li>
                  <li><strong>{t('legitimateInterests')}:</strong> {t('legitimateInterestsDesc')}</li>
                  <li><strong>{t('consent')}:</strong> {t('consentDesc')}</li>
                </ul>
              </section>

              {/* 5. Veri Paylaşımı */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('dataSharing')}</h2>
                <p className="mb-3">{t('dataSharingIntro')}</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>{t('paymentProcessors')}:</strong> Stripe</li>
                  <li><strong>{t('emailServices')}:</strong> Resend</li>
                  <li><strong>{t('hostingServices')}:</strong> Vercel, Supabase</li>
                  <li><strong>{t('sellers')}:</strong> {t('sellersDesc')}</li>
                </ul>
              </section>

              {/* 6. Veri Güvenliği */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('dataSecurity')}</h2>
                <p className="text-muted-foreground mb-3">{t('dataSecurityDesc')}</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t('sslEncryption')}</li>
                  <li>{t('secureDatabase')}</li>
                  <li>{t('regularBackups')}</li>
                  <li>{t('accessControl')}</li>
                </ul>
              </section>

              {/* 7. Haklarınız */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('yourRights')}</h2>
                <p className="mb-3">{t('yourRightsIntro')}</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>{t('rightToAccess')}:</strong> {t('rightToAccessDesc')}</li>
                  <li><strong>{t('rightToRectification')}:</strong> {t('rightToRectificationDesc')}</li>
                  <li><strong>{t('rightToErasure')}:</strong> {t('rightToErasureDesc')}</li>
                  <li><strong>{t('rightToRestriction')}:</strong> {t('rightToRestrictionDesc')}</li>
                  <li><strong>{t('rightToPortability')}:</strong> {t('rightToPortabilityDesc')}</li>
                  <li><strong>{t('rightToObject')}:</strong> {t('rightToObjectDesc')}</li>
                </ul>
                <p className="mt-4 text-sm text-muted-foreground">
                  {t('exerciseRights')}: privacy@wearo.com
                </p>
              </section>

              {/* 8. Çerezler */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('cookies')}</h2>
                <p className="text-muted-foreground mb-3">{t('cookiesDesc')}</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>{t('essentialCookies')}:</strong> {t('essentialCookiesDesc')}</li>
                  <li><strong>{t('analyticsCookies')}:</strong> {t('analyticsCookiesDesc')}</li>
                  <li><strong>{t('functionalCookies')}:</strong> {t('functionalCookiesDesc')}</li>
                </ul>
              </section>

              {/* 9. Veri Saklama Süresi */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('dataRetention')}</h2>
                <p className="text-muted-foreground">{t('dataRetentionDesc')}</p>
              </section>

              {/* 10. Çocukların Gizliliği */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('childrensPrivacy')}</h2>
                <p className="text-muted-foreground">{t('childrensPrivacyDesc')}</p>
              </section>

              {/* 11. Değişiklikler */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('policyChanges')}</h2>
                <p className="text-muted-foreground">{t('policyChangesDesc')}</p>
              </section>

              {/* 12. İletişim */}
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('contact')}</h2>
                <p className="text-muted-foreground mb-3">{t('contactDesc')}</p>
                <div className="bg-primary/5 p-4 rounded-xl">
                  <p className="font-semibold">Wearo - {t('dataProtectionOfficer')}</p>
                  <p className="text-sm text-muted-foreground">Email: privacy@wearo.com</p>
                  <p className="text-sm text-muted-foreground">Email: dpo@wearo.com</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
