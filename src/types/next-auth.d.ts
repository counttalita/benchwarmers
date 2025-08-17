import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      phoneNumber: string
      role: string
      company: {
        id: string
        name: string
        type: string
        status: string
      }
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    phoneNumber: string
    role: string
    company: {
      id: string
      name: string
      type: string
      status: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    phoneNumber: string
    role: string
    company: {
      id: string
      name: string
      type: string
      status: string
    }
  }
}