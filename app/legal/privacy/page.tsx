import FloatingParticles from '@/components/floating-particles'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/" className="flex items-center gap-2 mb-6 hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Ana Sayfa
          </Link>

          <h1 className="font-serif text-4xl font-bold mb-8">Datenschutzerklärung (DSGVO)</h1>

          <div className="glass border border-border rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">1. Datenschutz auf einen Blick</h2>

              <h3 className="text-lg font-semibold mb-2 mt-4">Allgemeine Hinweise</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten
                passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie
                persönlich identifiziert werden können.
              </p>

              <h3 className="text-lg font-semibold mb-2">Datenerfassung auf dieser Website</h3>
              <p className="text-muted-foreground text-sm">
                <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong><br />
                Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten
                können Sie dem Impressum dieser Website entnehmen.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">2. Hosting und Content Delivery Networks (CDN)</h2>

              <h3 className="text-lg font-semibold mb-2 mt-4">Vercel</h3>
              <p className="text-muted-foreground text-sm">
                Diese Website wird bei Vercel gehostet. Anbieter ist Vercel Inc., 340 S Lemon Ave #4133,
                Walnut, CA 91789, USA. Details entnehmen Sie der Datenschutzerklärung von Vercel:{' '}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://vercel.com/legal/privacy-policy
                </a>
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">3. Allgemeine Hinweise und Pflichtinformationen</h2>

              <h3 className="text-lg font-semibold mb-2 mt-4">Datenschutz</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre
                personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie
                dieser Datenschutzerklärung.
              </p>

              <h3 className="text-lg font-semibold mb-2">Hinweis zur verantwortlichen Stelle</h3>
              <p className="text-muted-foreground text-sm">
                Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br />
                [Firmenname]<br />
                [Adresse]<br />
                E-Mail: [E-Mail-Adresse]
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">4. Datenerfassung auf dieser Website</h2>

              <h3 className="text-lg font-semibold mb-2 mt-4">Cookies</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Unsere Internetseiten verwenden so genannte „Cookies". Cookies sind kleine Textdateien und richten auf
                Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung
                (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert.
              </p>

              <h3 className="text-lg font-semibold mb-2">Server-Log-Dateien</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien,
                die Ihr Browser automatisch an uns übermittelt. Dies sind:
              </p>
              <ul className="list-disc list-inside text-muted-foreground text-sm mb-4 space-y-1">
                <li>Browsertyp und Browserversion</li>
                <li>verwendetes Betriebssystem</li>
                <li>Referrer URL</li>
                <li>Hostname des zugreifenden Rechners</li>
                <li>Uhrzeit der Serveranfrage</li>
                <li>IP-Adresse</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2">Kontaktformular</h3>
              <p className="text-muted-foreground text-sm">
                Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular
                inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall
                von Anschlussfragen bei uns gespeichert.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">5. Analyse-Tools und Werbung</h2>

              <h3 className="text-lg font-semibold mb-2 mt-4">Google Analytics</h3>
              <p className="text-muted-foreground text-sm">
                Diese Website nutzt Funktionen des Webanalysedienstes Google Analytics. Anbieter ist die Google Ireland
                Limited („Google"), Gordon House, Barrow Street, Dublin 4, Irland.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">6. Plugins und Tools</h2>

              <h3 className="text-lg font-semibold mb-2 mt-4">Google OAuth</h3>
              <p className="text-muted-foreground text-sm">
                Diese Website nutzt die OAuth-Funktion von Google zur Nutzeranmeldung. Anbieter ist Google Ireland Limited,
                Gordon House, Barrow Street, Dublin 4, Irland.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">7. Zahlungsanbieter</h2>

              <h3 className="text-lg font-semibold mb-2 mt-4">Stripe</h3>
              <p className="text-muted-foreground text-sm">
                Wir nutzen auf dieser Website den Zahlungsdienstleister Stripe. Anbieter ist die Stripe Payments Europe,
                Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland (nachfolgend „Stripe").
                <br /><br />
                Wenn Sie die Bezahlfunktion von Stripe nutzen, werden Ihre Zahlungsdaten an Stripe übermittelt.
                Details entnehmen Sie der Datenschutzerklärung von Stripe:{' '}
                <a
                  href="https://stripe.com/de/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://stripe.com/de/privacy
                </a>
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">8. Ihre Rechte</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Sie haben jederzeit das Recht:
              </p>
              <ul className="list-disc list-inside text-muted-foreground text-sm space-y-2">
                <li>gemäß Art. 15 DSGVO Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten zu verlangen</li>
                <li>gemäß Art. 16 DSGVO unverzüglich die Berichtigung unrichtiger oder Vervollständigung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen</li>
                <li>gemäß Art. 17 DSGVO die Löschung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen</li>
                <li>gemäß Art. 18 DSGVO die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen</li>
                <li>gemäß Art. 20 DSGVO Ihre personenbezogenen Daten in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten</li>
                <li>gemäß Art. 21 DSGVO Widerspruch gegen die Verarbeitung Ihrer personenbezogenen Daten einzulegen</li>
              </ul>
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
