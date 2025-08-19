'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function TestTwilioPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [sentOtp, setSentOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')

  const sendOTP = async () => {
    if (!phoneNumber) {
      setMessage('Please enter a phone number')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      })

      const data = await response.json()

      if (response.ok) {
        setSentOtp(data.otp) // In production, this wouldn't be returned
        setStep('otp')
        setMessage('OTP sent successfully! Check your phone.')
      } else {
        setMessage(data.error || 'Failed to send OTP')
      }
    } catch {
      setMessage('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async () => {
    if (!otp) {
      setMessage('Please enter the OTP')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, otp }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('OTP verified successfully!')
        setStep('phone')
        setPhoneNumber('')
        setOtp('')
        setSentOtp('')
      } else {
        setMessage(data.error || 'Invalid OTP')
      }
    } catch {
      setMessage('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetTest = () => {
    setStep('phone')
    setPhoneNumber('')
    setOtp('')
    setSentOtp('')
    setMessage('')
  }

  return (
    <div className="container mx-auto p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Twilio OTP Test</h1>
      
      {step === 'phone' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-2">
              Phone Number (with country code)
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e: any) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full p-3 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: +1234567890 (include country code)
            </p>
          </div>
          
          <Button 
            onClick={sendOTP} 
            disabled={loading || !phoneNumber}
            className="w-full"
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </Button>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium mb-2">
              Enter OTP
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e: any) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full p-3 border rounded-md text-center text-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the 6-digit code sent to {phoneNumber}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={verifyOTP} 
              disabled={loading || !otp}
              className="flex-1"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
            <Button 
              onClick={resetTest} 
              variant="outline"
              className="flex-1"
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {message && (
        <div className={`mt-4 p-3 rounded-md ${
          message.includes('success') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {sentOtp && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
          <p className="text-sm font-medium">Development Mode:</p>
          <p className="text-sm">OTP Code: {sentOtp}</p>
          <p className="text-xs mt-1">This is only shown in development for testing</p>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <h3 className="font-medium mb-2">Twilio Configuration</h3>
        <div className="text-sm space-y-1">
          <p><strong>Account SID:</strong> {process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID || 'Not configured'}</p>
          <p><strong>Phone Number:</strong> {process.env.NEXT_PUBLIC_TWILIO_PHONE_NUM || 'Not configured'}</p>
          <p><strong>Status:</strong> {
            process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID ? 
            '✅ Configured' : 
            '❌ Missing configuration'
          }</p>
        </div>
      </div>
    </div>
  )
}