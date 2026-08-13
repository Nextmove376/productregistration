import { NextResponse } from 'next/server';

export async function GET() {
  const content = `# Next Move Services

## About
Next Move Services is a Dubai-based regulatory consultancy specializing in product registration, business setup, and compliance services in the UAE.

## Services
- Product Registration: Cosmetics, food, supplements, and household goods through Dubai Municipality, ESMA, and MOIAT
- MOHAP / EDE Registration: Medical devices, pharmaceuticals, and health products through the Ministry of Health
- Regulatory Approvals: ESMA, Dubai Municipality, and federal regulatory approvals
- Business Setup: Freezone and mainland company formation, trade licenses, and PRO services
- MOFA Attestation: Ministry of Foreign Affairs document attestation and legalization
- Medical & Drugstore: Pharmacy setup, drug store licensing, and medical equipment registration

## Contact
- Phone: +971 52 910 2088
- Email: registrations@nextmoveservices.ae
- Address: Iliya Tower 1, Office#207, PB#234823, Dubai, UAE
- Website: https://productregistrationinuae.com

## Location
Dubai, United Arab Emirates
Serving clients across the UAE and GCC region
`;

  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
