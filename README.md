# Benchwarmers 🏃‍♂️

A B2B talent marketplace connecting companies with benched professionals to organizations seeking specialized skills. Transform downtime into opportunity by monetizing benched resources while enabling quick access to pre-vetted, experienced professionals.

## 🎯 Vision

Benchwarmers revolutionizes resource utilization in the professional services sector by creating a premium, buyer-driven marketplace where only paying talent seekers can approach providers, ensuring quality interactions and reducing spam.

## 🚀 Key Features

### For Talent Providers (Companies with Benched Talent)
- **Profile Management**: Create and manage detailed talent profiles
- **Availability Tracking**: Real-time availability calendar integration
- **Rate Setting**: Flexible pricing with multiple currency support
- **Performance Analytics**: Track engagement success and ratings
- **Secure Payments**: 85% of engagement value with escrow protection

### For Talent Seekers (Companies Needing Temporary Talent)
- **Advanced Matching**: AI-powered matching algorithm with 24-hour response
- **Quality Assurance**: Pre-vetted professionals with verified skills
- **Transparent Pricing**: Clear cost breakdown with 15% platform fee
- **Escrow Protection**: Secure payment holding until engagement completion
- **Performance Tracking**: Comprehensive engagement monitoring

### Platform Features
- **15% Platform Fee**: Transparent revenue model on successful engagements
- **Escrow System**: Secure payment holding and distribution
- **Real-time Notifications**: Instant updates on matches, offers, and payments
- **Compliance Ready**: GDPR/POPIA compliant from day one
- **Enterprise Security**: Bank-level security with 2FA support

## 🏗️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Headless UI
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Fastify
- **Language**: TypeScript
- **ORM**: Prisma
- **Validation**: Zod
- **Authentication**: NextAuth.js

### Database & Infrastructure
- **Database**: PostgreSQL (PlanetScale in production)
- **Caching**: Redis (Upstash)
- **Hosting**: Vercel (Frontend) + Railway/Render (Backend)
- **File Storage**: AWS S3 + CloudFront
- **CDN**: CloudFront

### Third-Party Services
- **Payments**: Stripe Connect (Marketplace)
- **Email**: Resend
- **Real-time**: Pusher
- **Analytics**: Posthog/Mixpanel

## 💰 Business Model

### Revenue Stream
- **15% Platform Fee**: Applied to all successful engagements
- **No Upfront Costs**: Seekers only pay when they engage talent
- **Escrow Protection**: Secure payment holding until completion
- **Automatic Distribution**: 85% to providers, 15% to platform

### Value Proposition
- **For Providers**: Monetize benched resources, reduce overhead costs
- **For Seekers**: Access pre-vetted talent quickly, accelerate project delivery
- **For Platform**: Sustainable revenue model with network effects

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- PostgreSQL database
- Stripe account
- AWS S3 bucket

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/counttalita/benchwarmers.git
   cd benchwarmers
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://..."
   
   # Authentication
   NEXTAUTH_SECRET="your-secret"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Stripe
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   
   # AWS S3
   AWS_ACCESS_KEY_ID="your-access-key"
   AWS_SECRET_ACCESS_KEY="your-secret-key"
   AWS_REGION="us-east-1"
   AWS_S3_BUCKET="your-bucket-name"
   
   # Email
   RESEND_API_KEY="re_..."
   
   # Real-time
   PUSHER_APP_ID="your-app-id"
   PUSHER_KEY="your-key"
   PUSHER_SECRET="your-secret"
   PUSHER_CLUSTER="your-cluster"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
benchwarmers/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Dashboard routes
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── lib/                  # Utility functions
│   ├── auth.ts           # Authentication utilities
│   ├── db.ts             # Database utilities
│   └── utils.ts          # General utilities
├── prisma/               # Database schema
│   └── schema.prisma     # Prisma schema
├── types/                # TypeScript types
└── public/               # Static assets
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push database schema
- `npm run db:studio` - Open Prisma Studio

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Code formatting
- **Husky**: Git hooks for code quality

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy automatically** on push to main branch

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm run start
   ```

## 📊 Monitoring & Analytics

- **Error Tracking**: Sentry integration
- **Performance**: Vercel Analytics
- **User Analytics**: Posthog/Mixpanel
- **Uptime**: Pingdom monitoring
- **Logs**: Structured logging with correlation IDs

## 🔒 Security

- **Authentication**: NextAuth.js with 2FA support
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: AES-256 encryption at rest
- **Transport Security**: TLS 1.3 for all communications
- **Compliance**: GDPR/POPIA compliant
- **Rate Limiting**: API abuse protection

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow conventional commits
- Ensure code passes linting

## 📈 Roadmap

### Phase 1 (MVP) - 12 weeks ✅
- [x] Core authentication and company onboarding
- [x] Talent provider profile management
- [x] Marketplace payment integration (15% fee)
- [x] Talent request and matching engine
- [x] Offer management and payment flow
- [x] Real-time notifications
- [x] Performance tracking and reviews
- [x] Admin dashboard and compliance

### Phase 2 (Months 4-6)
- [ ] Advanced analytics and reporting
- [ ] API for third-party integrations
- [ ] Mobile app development
- [ ] Advanced matching algorithms with ML
- [ ] Multi-language support
- [ ] Invoice billing for enterprise clients

### Phase 3 (Months 7-9)
- [ ] AI-powered skill matching
- [ ] Predictive analytics
- [ ] Advanced payment features
- [ ] White-label solutions
- [ ] Dynamic pricing based on demand/supply

### Phase 4 (Months 10-12)
- [ ] Enterprise integrations
- [ ] Advanced compliance features
- [ ] International expansion
- [ ] Advanced escrow and payment features

## 📞 Support

- **Documentation**: [docs.benchwarmers.com](https://docs.benchwarmers.com)
- **Email**: support@benchwarmers.com
- **Discord**: [Join our community](https://discord.gg/benchwarmers)
- **Twitter**: [@benchwarmers](https://twitter.com/benchwarmers)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Powered by [Stripe](https://stripe.com/)
- Hosted on [Vercel](https://vercel.com/)

---

**Benchwarmers** - Transforming downtime into opportunity 🚀
