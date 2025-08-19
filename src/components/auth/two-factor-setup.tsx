"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Shield, ShieldCheck, Smartphone, Key, Copy, CheckCircle, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api/client"
import { createError, AppError } from "@/lib/errors"
import { ErrorAlert, SuccessAlert } from "@/components/error"
import QRCode from "qrcode"

interface TwoFactorSetupProps {
  userId: string
  isEnabled: boolean
  onStatusChange: (enabled: boolean) => void
}

export function TwoFactorSetup({ userId, isEnabled, onStatusChange }: TwoFactorSetupProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false)
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false)
  const [setupData, setSetupData] = useState<{
    secret: string
    qrCodeUrl: string
    backupCodes: string[]
  } | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [step, setStep] = useState<'generate' | 'verify' | 'complete'>('generate')

  const generateSetup = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.post('/api/auth/2fa/setup')
      
      if (response.error) {
        throw response.error
      }

      if (response.data) {
        setSetupData(response.data)
        
        // Generate QR code
        const qrDataUrl = await QRCode.toDataURL(response.data.qrCodeUrl)
        setQrCodeDataUrl(qrDataUrl)
        
        setStep('verify')
      }
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'SETUP_2FA_FAILED',
        err instanceof Error ? err.message : 'Failed to setup 2FA'
      )
      setError(appError)
    } finally {
      setIsLoading(false)
    }
  }

  const verifySetup = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.post('/api/auth/2fa/verify-setup', {
        code: verificationCode
      })
      
      if (response.error) {
        throw response.error
      }

      setStep('complete')
      setSuccess('2FA has been successfully enabled for your account')
      onStatusChange(true)
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'VERIFY_2FA_FAILED',
        err instanceof Error ? err.message : 'Failed to verify 2FA code'
      )
      setError(appError)
    } finally {
      setIsLoading(false)
    }
  }

  const disable2FA = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.post('/api/auth/2fa/disable', {
        code: disableCode
      })
      
      if (response.error) {
        throw response.error
      }

      setIsDisableDialogOpen(false)
      setDisableCode('')
      setSuccess('2FA has been disabled for your account')
      onStatusChange(false)
    } catch (err) {
      const appError = err instanceof AppError ? err : createError.validation(
        'DISABLE_2FA_FAILED',
        err instanceof Error ? err.message : 'Failed to disable 2FA'
      )
      setError(appError)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess('Copied to clipboard')
    setTimeout(() => setSuccess(null), 2000)
  }

  const resetSetup = () => {
    setStep('generate')
    setSetupData(null)
    setQrCodeDataUrl('')
    setVerificationCode('')
    setError(null)
    setSuccess(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account with 2FA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="font-medium">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
            {isEnabled && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Protected
              </Badge>
            )}
          </div>
          
          {isEnabled ? (
            <Dialog open={isDisableDialogOpen} onOpenChange={setIsDisableDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Disable 2FA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                  <DialogDescription>
                    Enter a verification code from your authenticator app to disable 2FA
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="disable-code">Verification Code</Label>
                    <Input
                      id="disable-code"
                      placeholder="Enter 6-digit code"
                      value={disableCode}
                      onChange={(e: any) => setDisableCode(e.target.value)}
                      maxLength={6}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDisableDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={disable2FA}
                    disabled={isLoading || disableCode.length !== 6}
                    variant="destructive"
                  >
                    {isLoading ? 'Disabling...' : 'Disable 2FA'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={isSetupDialogOpen} onOpenChange={(open: any) => {
              setIsSetupDialogOpen(open)
              if (!open) resetSetup()
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Enable 2FA
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
                  <DialogDescription>
                    Secure your account with an authenticator app
                  </DialogDescription>
                </DialogHeader>
                
                {step === 'generate' && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <Smartphone className="h-12 w-12 mx-auto text-blue-600 mb-4" />
                      <p className="text-sm text-muted-foreground">
                        You'll need an authenticator app like Google Authenticator, Authy, or 1Password
                      </p>
                    </div>
                    <Button onClick={generateSetup} disabled={isLoading} className="w-full">
                      {isLoading ? 'Generating...' : 'Get Started'}
                    </Button>
                  </div>
                )}

                {step === 'verify' && setupData && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="font-medium mb-2">Scan QR Code</h4>
                      {qrCodeDataUrl && (
                        <img src={qrCodeDataUrl} alt="2FA QR Code" className="mx-auto mb-4" />
                      )}
                      <p className="text-sm text-muted-foreground mb-4">
                        Or enter this code manually:
                      </p>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <code className="text-sm flex-1">{setupData.secret}</code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(setupData.secret)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="verification-code">Enter Verification Code</Label>
                      <Input
                        id="verification-code"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e: any) => setVerificationCode(e.target.value)}
                        maxLength={6}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={resetSetup}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={verifySetup}
                        disabled={isLoading || verificationCode.length !== 6}
                        className="flex-1"
                      >
                        {isLoading ? 'Verifying...' : 'Verify'}
                      </Button>
                    </div>
                  </div>
                )}

                {step === 'complete' && setupData && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                      <h4 className="font-medium mb-2">2FA Enabled Successfully!</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Backup Codes</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {setupData.backupCodes.map((code, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                            <code className="flex-1">{code}</code>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(setupData.backupCodes.join('\n'))}
                        className="w-full"
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copy All Codes
                      </Button>
                    </div>
                    
                    <Button
                      onClick={() => setIsSetupDialogOpen(false)}
                      className="w-full"
                    >
                      Done
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>

        {error && (
          <ErrorAlert 
            error={error} 
            onDismiss={() => setError(null)}
          />
        )}

        {success && (
          <SuccessAlert 
            message={success}
            onDismiss={() => setSuccess(null)}
          />
        )}

        <div className="text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500" />
            <div>
              <p className="font-medium">Important:</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Keep your backup codes in a safe place</li>
                <li>Don't share your authenticator app with others</li>
                <li>Admin accounts require 2FA for security</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
