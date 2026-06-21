import { NextRequest, NextResponse } from 'next/server'

const BASE = process.env.MYFATOORAH_BASE_URL!
const API_KEY = process.env.MYFATOORAH_API_KEY!

export async function POST(req: NextRequest) {
  try {
    const { paymentId } = await req.json()

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })
    }

    const res = await fetch(`${BASE}/v2/GetPaymentStatus`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Key: paymentId, KeyType: 'PaymentId' }),
    })

    const data = await res.json()

    if (!data.IsSuccess) {
      return NextResponse.json({ error: 'Could not fetch payment status' }, { status: 400 })
    }

    const invoice = data.Data
    const paid = invoice.InvoiceStatus === 'Paid'

    return NextResponse.json({
      success: paid,
      status: invoice.InvoiceStatus,          // "Paid" | "Pending" | "Failed"
      planId: invoice.UserDefinedField,        // "pro" | "elite"
      profileId: invoice.CustomerReference,    // user_profiles.id
      amount: invoice.InvoiceValue,
      currency: invoice.InvoiceCurrency,
      invoiceId: invoice.InvoiceId,
    })
  } catch (err) {
    console.error('[verify]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
