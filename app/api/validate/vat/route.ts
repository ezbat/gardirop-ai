import { NextRequest, NextResponse } from 'next/server'

// EU VIES API ile USt-IdNr doğrulama
export async function POST(request: NextRequest) {
  try {
    const { vatNumber } = await request.json()

    if (!vatNumber || typeof vatNumber !== 'string') {
      return NextResponse.json({ error: 'VAT number is required' }, { status: 400 })
    }

    // Format kontrolü: DE + 9 rakam
    const cleaned = vatNumber.trim().toUpperCase()
    if (!cleaned.match(/^DE\d{9}$/)) {
      return NextResponse.json({
        valid: false,
        error: 'Ungültiges Format. USt-IdNr muss mit DE beginnen und 9 Ziffern enthalten.'
      })
    }

    // EU VIES API ile doğrulama
    const countryCode = cleaned.substring(0, 2)
    const vatNum = cleaned.substring(2)

    const soapRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
        <soapenv:Header/>
        <soapenv:Body>
          <urn:checkVat>
            <urn:countryCode>${countryCode}</urn:countryCode>
            <urn:vatNumber>${vatNum}</urn:vatNumber>
          </urn:checkVat>
        </soapenv:Body>
      </soapenv:Envelope>
    `.trim()

    const response = await fetch('https://ec.europa.eu/taxation_customs/vies/services/checkVatService', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': ''
      },
      body: soapRequest
    })

    const xmlText = await response.text()

    // XML yanıtını parse et
    const isValid = xmlText.includes('<valid>true</valid>')

    if (!isValid) {
      return NextResponse.json({
        valid: false,
        error: 'USt-IdNr konnte beim Bundeszentralamt für Steuern nicht verifiziert werden.'
      })
    }

    // Firma adını extract et
    let companyName = ''
    const nameMatch = xmlText.match(/<name>([^<]+)<\/name>/)
    if (nameMatch) {
      companyName = nameMatch[1]
    }

    // Adresi extract et
    let address = ''
    const addressMatch = xmlText.match(/<address>([^<]+)<\/address>/)
    if (addressMatch) {
      address = addressMatch[1].replace(/\n/g, ', ')
    }

    return NextResponse.json({
      valid: true,
      vatNumber: cleaned,
      companyName,
      address,
      message: 'USt-IdNr erfolgreich verifiziert'
    })

  } catch (error: any) {
    console.error('VAT validation error:', error)
    return NextResponse.json({
      valid: false,
      error: 'VIES-Dienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.'
    }, { status: 500 })
  }
}
