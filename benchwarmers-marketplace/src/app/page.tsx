import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            BenchWarmers Marketplace
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A B2B talent marketplace connecting companies with benched professionals 
            to organizations seeking specialized skills.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/test-db">Test Database Connection</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/test-appwrite-connection">Test Appwrite Connection</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/test-twilio">Test Twilio OTP</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Next.js 14</h3>
            <p className="text-sm text-muted-foreground">
              Modern React framework with App Router and TypeScript
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Prisma + PostgreSQL</h3>
            <p className="text-sm text-muted-foreground">
              Type-safe database access with comprehensive schema
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Twilio SMS + OTP</h3>
            <p className="text-sm text-muted-foreground">
              Phone-based authentication with SMS OTP verification
            </p>
          </div>
        </div>

        <div className="mt-16 p-6 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Development Setup Complete ✅</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Next.js 14 with TypeScript and Tailwind CSS</p>
            <p>• Prisma ORM with PostgreSQL database</p>
            <p>• Docker containers for development</p>
            <p>• shadcn/ui component library</p>
            <p>• Appwrite integration for file storage</p>
            <p>• Twilio SMS authentication with OTP</p>
            <p>• Essential dependencies installed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
