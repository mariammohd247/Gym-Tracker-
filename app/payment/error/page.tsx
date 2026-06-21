'use client'

import { XCircle } from 'lucide-react'

export default function PaymentErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Payment cancelled</h2>
        <p className="text-gray-400 text-sm mb-6">
          Your payment was not completed. You have not been charged. Feel free to try again anytime.
        </p>
        <a
          href="/"
          className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-all active:scale-95 mb-3"
        >
          Back to Dashboard
        </a>
        <a
          href="/?subscribe=true"
          className="block w-full bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-semibold py-3 rounded-xl transition-all active:scale-95"
        >
          Try Again
        </a>
      </div>
    </div>
  )
}
