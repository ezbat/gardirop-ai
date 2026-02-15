import FloatingParticles from '@/components/floating-particles'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ImpressumPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/" className="flex items-center gap-2 mb-6 hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Ana Sayfa
          </Link>

          <h1 className="font-serif text-4xl font-bold mb-8">Impressum</h1>

          <div className="glass border border-border rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">Angaben gemäß § 5 TMG</h2>
              <p className="text-muted-foreground">
                [Firmenname]<br />
                [Straße und Hausnummer]<br />
                [PLZ und Ort]<br />
                Deutschland
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Vertreten durch</h2>
              <p className="text-muted-foreground">
                [Name des Geschäftsführers / Inhabers]
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Kontakt</h2>
              <p className="text-muted-foreground">
                Telefon: [Telefonnummer]<br />
                E-Mail: [E-Mail-Adresse]
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Umsatzsteuer-ID</h2>
              <p className="text-muted-foreground">
                Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:<br />
                [USt-IdNr.]
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">EU-Streitschlichtung</h2>
              <p className="text-muted-foreground">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:<br />
                <a
                  href="https://ec.europa.eu/consumers/odr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
                <br />
                Unsere E-Mail-Adresse finden Sie oben im Impressum.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
              <p className="text-muted-foreground">
                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
                Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Haftung für Inhalte</h2>
              <p className="text-muted-foreground text-sm">
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den
                allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
                verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
                zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Haftung für Links</h2>
              <p className="text-muted-foreground text-sm">
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
                Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
                Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">Urheberrecht</h2>
              <p className="text-muted-foreground text-sm">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
                Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
                Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
