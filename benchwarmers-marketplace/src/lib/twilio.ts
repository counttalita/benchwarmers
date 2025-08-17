import twilio from 'twilio'

// Twilio client configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUM

// Create client only if all credentials are available
export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null

export const TWILIO_CONFIG = {
  accountSid,
  phoneNumber: twilioPhoneNumber,
}

// Generate a 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP via SMS
export const sendOTP = async (phoneNumber: string, otp: string): Promise<boolean> => {
  if (!twilioClient || !twilioPhoneNumber) {
    console.error('Twilio not configured. Missing credentials.')
    return false
  }

  try {
    const message = await twilioClient.messages.create({
      body: `Your BenchWarmers verification code is: ${otp}. This code expires in 5 minutes.`,
      from: twilioPhoneNumber,
      to: phoneNumber,
    })

    console.log(`OTP sent successfully. Message SID: ${message.sid}`)
    return true
  } catch (error) {
    console.error('Failed to send OTP:', error)
    return false
  }
}

// Send general SMS notification
export const sendSMS = async (phoneNumber: string, message: string): Promise<boolean> => {
  try {
    const sms = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneNumber,
    })

    console.log(`SMS sent successfully. Message SID: ${sms.sid}`)
    return true
  } catch (error) {
    console.error('Failed to send SMS:', error)
    return false
  }
}

// Validate phone number format
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  // Basic E.164 format validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/
  return phoneRegex.test(phoneNumber)
}

// Format phone number to E.164 format
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '')
  
  // Add country code if missing (assuming US +1 for now)
  if (digits.length === 10) {
    return `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  
  // Return as-is if already formatted or unknown format
  return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`
}