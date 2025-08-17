import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { formatPhoneNumber } from "@/lib/twilio"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "text" },
        otp: { label: "OTP", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber || !credentials?.otp) {
          throw new Error("Phone number and OTP are required")
        }

        const formattedPhone = formatPhoneNumber(credentials.phoneNumber)

        // Find the user
        const user = await prisma.user.findUnique({
          where: { phoneNumber: formattedPhone },
          include: { company: true }
        })

        if (!user) {
          throw new Error("User not found")
        }

        // Find the OTP code
        const otpRecord = await prisma.oTPCode.findFirst({
          where: {
            userId: user.id,
            phoneNumber: formattedPhone,
            verified: false,
          },
          orderBy: { createdAt: 'desc' }
        })

        if (!otpRecord) {
          throw new Error("No valid OTP found. Please request a new one.")
        }

        // Check if OTP is expired
        if (otpRecord.expiresAt < new Date()) {
          throw new Error("OTP has expired. Please request a new one.")
        }

        // Check attempt limit
        if (otpRecord.attempts >= 3) {
          throw new Error("Too many failed attempts. Please request a new OTP.")
        }

        // Verify OTP
        if (otpRecord.code !== credentials.otp) {
          // Increment attempts
          await prisma.oTPCode.update({
            where: { id: otpRecord.id },
            data: { attempts: otpRecord.attempts + 1 }
          })
          throw new Error("Invalid OTP. Please try again.")
        }

        // Mark OTP as verified
        await prisma.oTPCode.update({
          where: { id: otpRecord.id },
          data: { verified: true }
        })

        // Update user verification status
        await prisma.user.update({
          where: { id: user.id },
          data: {
            phoneVerified: true,
            phoneVerifiedAt: new Date(),
            lastLoginAt: new Date(),
          }
        })

        // Clean up old OTP codes
        await prisma.oTPCode.deleteMany({
          where: {
            userId: user.id,
            id: { not: otpRecord.id }
          }
        })

        return {
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          email: user.email,
          role: user.role,
          company: {
            id: user.company.id,
            name: user.company.name,
            type: user.company.type,
            status: user.company.status,
          }
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.phoneNumber = user.phoneNumber
        token.role = user.role
        token.company = user.company
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.phoneNumber = token.phoneNumber as string
        session.user.role = token.role as string
        session.user.company = token.company as {
          id: string
          name: string
          type: string
          status: string
        }
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
}