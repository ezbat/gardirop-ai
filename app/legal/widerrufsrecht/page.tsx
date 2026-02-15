import FloatingParticles from '@/components/floating-particles'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function WiderrufsrechtPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/" className="flex items-center gap-2 mb-6 hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Ana Sayfa
          </Link>

          <h1 className="font-serif text-4xl font-bold mb-8">Widerrufsrecht</h1>

          <div className="glass border border-border rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">Widerrufsbelehrung</h2>

              <h3 className="text-lg font-semibold mb-2 mt-4">Widerrufsrecht</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.
              </p>

              <p className="text-muted-foreground text-sm mb-4">
                Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter,
                der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.
              </p>

              <p className="text-muted-foreground text-sm mb-4">
                Um Ihr Widerrufsrecht auszuüben, müssen Sie uns:<br />
                <strong>[Firmenname]</strong><br />
                [Adresse]<br />
                E-Mail: [E-Mail-Adresse]<br />
                Telefon: [Telefonnummer]
              </p>

              <p className="text-muted-foreground text-sm mb-4">
                mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren
                Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte
                Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
              </p>

              <p className="text-muted-foreground text-sm mb-4">
                Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des
                Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Folgen des Widerrufs</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben,
                einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass
                Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt
                haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die
                Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist.
              </p>

              <p className="text-muted-foreground text-sm mb-4">
                Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen
                Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in
                keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
              </p>

              <p className="text-muted-foreground text-sm mb-4">
                Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den
                Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere
                Zeitpunkt ist.
              </p>

              <p className="text-muted-foreground text-sm mb-4">
                Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem
                Sie uns über den Widerruf dieses Vertrags unterrichten, an uns zurückzusenden oder zu übergeben. Die
                Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden.
              </p>

              <p className="text-muted-foreground text-sm">
                Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.
              </p>
            </div>

            <div className="border-t border-border pt-6">
              <h2 className="text-xl font-bold mb-3">Muster-Widerrufsformular</h2>
              <div className="glass border border-border rounded-xl p-6 bg-muted/5">
                <p className="text-sm text-muted-foreground mb-4">
                  (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)
                </p>

                <div className="text-sm space-y-2">
                  <p>An:</p>
                  <p className="ml-4">
                    [Firmenname]<br />
                    [Adresse]<br />
                    E-Mail: [E-Mail-Adresse]
                  </p>

                  <p className="pt-4">
                    Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der
                    folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)
                  </p>

                  <p className="pt-4">
                    Bestellt am (*)/erhalten am (*)
                  </p>

                  <p className="pt-4">
                    Name des/der Verbraucher(s)
                  </p>

                  <p className="pt-4">
                    Anschrift des/der Verbraucher(s)
                  </p>

                  <p className="pt-4">
                    Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)
                  </p>

                  <p className="pt-4">
                    Datum
                  </p>

                  <p className="pt-6 text-xs italic">
                    (*) Unzutreffendes streichen.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Hinweis zur Rücksendung</h3>
              <p className="text-sm text-blue-300 mb-2">
                So senden Sie Ihre Artikel zurück:
              </p>
              <ol className="text-sm text-blue-300 space-y-2 list-decimal list-inside">
                <li>Reichen Sie eine Rückgabeanfrage über Ihr Bestellkonto ein</li>
                <li>Warten Sie auf die Genehmigung des Verkäufers</li>
                <li>Erhalten Sie die Rücksendeadresse per E-Mail</li>
                <li>Senden Sie die Artikel in Originalverpackung zurück</li>
                <li>Nach Erhalt der Ware erstatten wir Ihnen den Kaufpreis</li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
