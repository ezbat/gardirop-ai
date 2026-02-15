import FloatingParticles from '@/components/floating-particles'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AGBPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/" className="flex items-center gap-2 mb-6 hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Ana Sayfa
          </Link>

          <h1 className="font-serif text-4xl font-bold mb-8">Allgemeine Geschäftsbedingungen (AGB)</h1>

          <div className="glass border border-border rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">§ 1 Geltungsbereich</h2>
              <p className="text-muted-foreground text-sm mb-4">
                (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB") der [Firmenname] (nachfolgend "Anbieter"),
                gelten für alle Verträge über die Lieferung von Waren, die ein Verbraucher oder Unternehmer
                (nachfolgend „Kunde") mit dem Anbieter hinsichtlich der vom Anbieter in seinem Online-Shop dargestellten
                Waren abschließt.
              </p>
              <p className="text-muted-foreground text-sm">
                (2) Verbraucher im Sinne dieser AGB ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken
                abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit
                zugerechnet werden können.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">§ 2 Vertragsschluss</h2>
              <p className="text-muted-foreground text-sm mb-4">
                (1) Die im Online-Shop des Anbieters enthaltenen Produktbeschreibungen stellen keine verbindlichen
                Angebote seitens des Anbieters dar, sondern dienen zur Abgabe eines verbindlichen Angebots durch den
                Kunden.
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                (2) Der Kunde kann das Angebot über das in den Online-Shop des Anbieters integrierte Online-Bestellformular
                abgeben. Dabei gibt der Kunde, nachdem er die ausgewählten Waren in den virtuellen Warenkorb gelegt und
                den elektronischen Bestellprozess durchlaufen hat, durch Klicken des den Bestellvorgang abschließenden
                Buttons ein rechtlich verbindliches Vertragsangebot in Bezug auf die im Warenkorb enthaltenen Waren ab.
              </p>
              <p className="text-muted-foreground text-sm">
                (3) Der Anbieter kann das Angebot des Kunden innerhalb von fünf Tagen annehmen, indem er dem Kunden eine
                schriftliche Auftragsbestätigung oder eine Auftragsbestätigung in Textform (Fax oder E-Mail) übermittelt,
                wobei insoweit der Zugang der Auftragsbestätigung beim Kunden maßgeblich ist, oder indem er dem Kunden
                die bestellte Ware liefert, wobei insoweit der Zugang der Ware beim Kunden maßgeblich ist.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">§ 3 Preise und Zahlungsbedingungen</h2>
              <p className="text-muted-foreground text-sm mb-4">
                (1) Sofern sich aus der Produktbeschreibung des Anbieters nichts anderes ergibt, handelt es sich bei den
                angegebenen Preisen um Gesamtpreise, die die gesetzliche Umsatzsteuer enthalten. Gegebenenfalls zusätzlich
                anfallende Liefer- und Versandkosten werden in der jeweiligen Produktbeschreibung gesondert angegeben.
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                (2) Die Zahlung erfolgt wahlweise per:
              </p>
              <ul className="list-disc list-inside text-muted-foreground text-sm mb-4 space-y-1">
                <li>Kreditkarte (Visa, Mastercard)</li>
                <li>Debitkarte</li>
                <li>SEPA-Lastschrift</li>
                <li>Sofortüberweisung</li>
              </ul>
              <p className="text-muted-foreground text-sm">
                (3) Die Zahlungsabwicklung erfolgt über unseren Zahlungsdienstleister Stripe Payments Europe Ltd.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">§ 4 Lieferbedingungen</h2>
              <p className="text-muted-foreground text-sm mb-4">
                (1) Die Lieferung von Waren erfolgt auf dem Versandweg an die vom Kunden angegebene Lieferanschrift.
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                (2) Sofern die Zustellung der Ware trotz dreimaligem Auslieferungsversuchs scheitert, kann der Anbieter
                vom Vertrag zurücktreten. Ggf. geleistete Zahlungen werden dem Kunden unverzüglich erstattet.
              </p>
              <p className="text-muted-foreground text-sm">
                (3) Die Lieferzeit beträgt, soweit nicht anders angegeben, bis zu 7 Werktage. Der Versand erfolgt
                spätestens innerhalb von 5 Werktagen nach Vertragsschluss.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">§ 5 Eigentumsvorbehalt</h2>
              <p className="text-muted-foreground text-sm">
                Bis zur vollständigen Bezahlung verbleiben die gelieferten Waren im Eigentum des Anbieters.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">§ 6 Mängelhaftung (Gewährleistung)</h2>
              <p className="text-muted-foreground text-sm mb-4">
                (1) Ist die Kaufsache mangelhaft, gelten die Vorschriften der gesetzlichen Mängelhaftung.
              </p>
              <p className="text-muted-foreground text-sm">
                (2) Der Kunde wird gebeten, angelieferte Waren mit offensichtlichen Transportschäden bei dem Zusteller
                zu reklamieren und den Anbieter hiervon in Kenntnis zu setzen. Kommt der Kunde dem nicht nach, hat dies
                keinerlei Auswirkungen auf seine gesetzlichen oder vertraglichen Mängelansprüche.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">§ 7 Besondere Bedingungen für Marketplace</h2>
              <p className="text-muted-foreground text-sm mb-4">
                (1) Der Anbieter betreibt einen Online-Marktplatz, auf dem Dritte (nachfolgend "Verkäufer") Waren zum
                Verkauf anbieten können.
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                (2) Bei Verkäufen durch Drittverkäufer kommt der Kaufvertrag direkt zwischen dem Kunden und dem jeweiligen
                Verkäufer zustande. Der Plattformbetreiber ist an diesem Vertrag nicht beteiligt.
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                (3) Die Zahlungsabwicklung erfolgt über den Plattformbetreiber. Der Plattformbetreiber behält eine
                Provision von 15% des Kaufpreises ein und leitet den verbleibenden Betrag an den Verkäufer weiter.
              </p>
              <p className="text-muted-foreground text-sm">
                (4) Für die Erfüllung des Vertrages (Lieferung, Gewährleistung, Rückabwicklung) ist ausschließlich der
                jeweilige Verkäufer verantwortlich.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">§ 8 Rückgabe und Widerruf</h2>
              <p className="text-muted-foreground text-sm mb-4">
                (1) Verbraucher haben ein 14-tägiges Widerrufsrecht gemäß der gesetzlichen Bestimmungen.
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                (2) Die Einzelheiten zum Widerrufsrecht finden Sie in unserer{' '}
                <Link href="/legal/widerrufsrecht" className="text-primary hover:underline">
                  Widerrufsbelehrung
                </Link>.
              </p>
              <p className="text-muted-foreground text-sm">
                (3) Bei Verkäufen durch Drittverkäufer ist das Widerrufsrecht gegenüber dem jeweiligen Verkäufer
                auszuüben. Die Rückabwicklung erfolgt über die Plattform.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">§ 9 Streitbeilegung</h2>
              <p className="text-muted-foreground text-sm">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit, die Sie unter{' '}
                <a
                  href="https://ec.europa.eu/consumers/odr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>{' '}
                finden. Wir sind nicht bereit und nicht verpflichtet, an einem Streitbeilegungsverfahren vor einer
                Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">§ 10 Schlussbestimmungen</h2>
              <p className="text-muted-foreground text-sm mb-4">
                (1) Auf Verträge zwischen dem Anbieter und den Kunden findet das Recht der Bundesrepublik Deutschland
                Anwendung. Die Geltung des UN-Kaufrechts ist ausgeschlossen.
              </p>
              <p className="text-muted-foreground text-sm">
                (2) Sofern es sich beim Kunden um einen Kaufmann, eine juristische Person des öffentlichen Rechts oder
                um ein öffentlich-rechtliches Sondervermögen handelt, ist Gerichtsstand für alle Streitigkeiten aus
                Vertragsverhältnissen zwischen dem Kunden und dem Anbieter der Sitz des Anbieters.
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Stand: {new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
