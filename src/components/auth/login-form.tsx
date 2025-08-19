"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  sendOtpSchema,
  verifyOtpSchema,
  type SendOtpFormData,
  type VerifyOtpFormData,
} from "@/lib/validations/auth"
import { OTPLoader, PendingButton } from "@/components/ui/bench-loader"

type LoginStep = "phone" | "otp"

export function LoginForm() {
  const [step, setStep] = useState<LoginStep>("phone")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()

  // Phone number form
  const phoneForm = useForm<SendOtpFormData>({
    resolver: zodResolver(sendOtpSchema),
    defaultValues: {
      phoneNumber: "",
    },
  })

  // OTP verification form
  const otpForm = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      phoneNumber: "",
      otp: "",
    },
  })

  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev: any) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const onSendOtp = async (data: SendOtpFormData) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle structured error response
        const errorMessage = result.error?.message || result.error || "Failed to send OTP"
        throw new Error(errorMessage)
      }

      setPhoneNumber(data.phoneNumber)
      setStep("otp")
      startCountdown()
      
      // Set phone number in OTP form
      otpForm.setValue("phoneNumber", data.phoneNumber)

      // Show OTP in development
      if (process.env.NODE_ENV === "development" && result.data?.otp) {
        console.log("Development OTP:", result.data.otp)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP")
    } finally {
      setIsLoading(false)
    }
  }

  const onVerifyOtp = async (data: VerifyOtpFormData) => {
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("phone-otp", {
        phoneNumber: data.phoneNumber,
        otp: data.otp,
        redirect: false,
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      if (result?.ok) {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP")
    } finally {
      setIsLoading(false)
    }
  }

  const resendOtp = async () => {
    if (countdown > 0) return

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle structured error response
        const errorMessage = result.error?.message || result.error || "Failed to resend OTP"
        throw new Error(errorMessage)
      }

      startCountdown()
      
      // Show OTP in development
      if (process.env.NODE_ENV === "development" && result.data?.otp) {
        console.log("Development OTP:", result.data.otp)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP")
    } finally {
      setIsLoading(false)
    }
  }

  const goBack = () => {
    setStep("phone")
    setError("")
    otpForm.reset()
  }

  if (step === "phone") {
    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Sign In</h1>
          <p className="text-muted-foreground">
            Enter your phone number to receive a verification code
          </p>
        </div>

        <Form {...phoneForm}>
          <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4">
            <FormField
              control={phoneForm.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+1234567890"
                      type="tel"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            {isLoading && <OTPLoader message="Sending verification code..." />}
            
            <PendingButton type="submit" className="w-full" isPending={isLoading}>
              Send Verification Code
            </PendingButton>
          </form>
        </Form>

        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Button variant="link" className="p-0 h-auto" asChild>
            <a href="/auth/register">Register your company</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Verify Your Phone</h1>
        <p className="text-muted-foreground">
          Enter the 6-digit code sent to {phoneNumber}
        </p>
      </div>

      <Form {...otpForm}>
        <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
          <FormField
            control={otpForm.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123456"
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <PendingButton type="submit" className="w-full" isPending={isLoading}>
            Verify Code
          </PendingButton>
        </form>
      </Form>

      <div className="space-y-4">
        <div className="text-center">
          <Button
            variant="link"
            onClick={resendOtp}
            disabled={countdown > 0 || isLoading}
            className="text-sm"
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
          </Button>
        </div>

        <div className="text-center">
          <Button variant="link" onClick={goBack} className="text-sm">
            ← Use different phone number
          </Button>
        </div>
      </div>
    </div>
  )
}