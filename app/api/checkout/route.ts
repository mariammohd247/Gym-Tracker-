import { NextRequest, NextResponse } from 'next/server'

const BASE = process.env.MYFATOORAH_BASE_URL!
const API_KEY = process.env.MYFATOORAH_API_KEY!

export async function POST(req: NextRequest) {
  try {
    const { planId, planName, amount, profileId, customerName, customerEmail } = await req.json()

    const origin = req.headers.get('origin') ?? req.nextUrl.origin

    // ── Step 1: get available payment methods for this amount ──
    const initRes = await fetch(`${BASE}/v2/InitiatePayment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ InvoiceAmount: amount, CurrencyIso: 'KWD' }),
    })

    const initData = await initRes.json()

    if (!initData.IsSuccess) {
      return NextResponse.json(
        { error: initData.ValidationErrors?.[0]?.Error ?? 'Failed to initiate payment' },
        { status: 400 }
      )
    }

    const methods: { PaymentMethodId: number; PaymentMethodEn: string }[] =
      initData.Data?.PaymentMethods ?? []

    if (methods.length === 0) {
      return NextResponse.json({ error: 'No payment methods available' }, { status: 400 })
    }

    // Prefer KNET for KWD; fall back to first available
    const method =
      methods.find(m => m.PaymentMethodEn?.toLowerCase().includes('knet')) ?? methods[0]

    // ── Step 2: execute payment → get redirect URL ──
    const execRes = await fetch(`${BASE}/v2/ExecutePayment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        PaymentMethodId: method.PaymentMethodId,
        CustomerName: customerName,
        DisplayCurrencyIso: 'KWD',
        CustomerEmail: customerEmail,
        InvoiceValue: amount,
        CallBackUrl: `${origin}/payment/success`,
        ErrorUrl: `${origin}/payment/error`,
        Language: 'en',
        CustomerReference: profileId,   // used after redirect to update profile
        UserDefinedField: planId,        // plan id stored in payment
        InvoiceItems: [
          { ItemName: planName, Quantity: 1, UnitPrice: amount },
        ],
      }),
    })

    const execData = await execRes.json()

    if (!execData.IsSuccess) {
      return NextResponse.json(
        { error: execData.ValidationErrors?.[0]?.Error ?? 'Payment execution failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      paymentUrl: execData.Data.PaymentURL,
      invoiceId: execData.Data.InvoiceId,
      paymentMethod: method.PaymentMethodEn,
    })
  } catch (err) {
    console.error('[checkout]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
