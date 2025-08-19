import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as verifyDomainPOST, GET as verifyDomainGET } from '@/app/api/auth/verify-domain/route';
import { POST as sendVerificationPOST } from '@/app/api/auth/send-domain-verification/route';

describe('Domain Verification API', () => {
  let testCompany: any;
  let testUser: any;

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create test data
    testCompany = {
      id: 'company-123',
      name: 'Test Company',
      domain: 'testcompany.com',
      type: 'provider',
      status: 'pending',
      domainVerified: false,
      domainVerificationToken: 'test-token-123',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    testUser = {
      id: 'user-123',
      name: 'Test Admin',
      email: 'admin@testcompany.com',
      phoneNumber: '+1234567890',
      role: 'admin',
      companyId: testCompany.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('POST /api/auth/verify-domain', () => {
    it('should verify domain with valid token', async () => {
      // Mock Prisma operations
      const mockPrisma = require('@/lib/prisma').prisma;
      mockPrisma.company.findFirst.mockResolvedValue(testCompany);
      mockPrisma.company.update.mockResolvedValue({
        ...testCompany,
        domainVerified: true,
        domainVerifiedAt: new Date(),
        status: 'active'
      });

      const request = new NextRequest('http://localhost:3000/api/auth/verify-domain', {
        method: 'POST',
        body: JSON.stringify({ token: 'test-token-123' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await verifyDomainPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Domain verified successfully');
      expect(data.company.domainVerified).toBe(true);
      expect(data.company.domainVerifiedAt).toBeTruthy();
    });

    it('should reject invalid token', async () => {
      // Mock Prisma to return null (company not found)
      const mockPrisma = require('@/lib/prisma').prisma;
      mockPrisma.company.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/verify-domain', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await verifyDomainPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Invalid or expired verification token');
    });

    it('should reject already verified domain', async () => {
      // Mock Prisma to return already verified company
      const verifiedCompany = { ...testCompany, domainVerified: true, domainVerifiedAt: new Date() };
      const mockPrisma = require('@/lib/prisma').prisma;
      mockPrisma.company.findFirst.mockResolvedValue(verifiedCompany);

      const request = new NextRequest('http://localhost:3000/api/auth/verify-domain', {
        method: 'POST',
        body: JSON.stringify({ token: 'test-token-123' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await verifyDomainPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Domain is already verified');
    });

    it('should validate token format', async () => {
      // Mock Prisma to return null (company not found due to invalid token)
      const mockPrisma = require('@/lib/prisma').prisma;
      mockPrisma.company.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/verify-domain', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-format' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await verifyDomainPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Invalid or expired verification token');
    });
  });

  describe('GET /api/auth/verify-domain', () => {
    it('should return company info for valid token', async () => {
      // Mock Prisma operations
      const mockPrisma = require('@/lib/prisma').prisma;
      mockPrisma.company.findFirst.mockResolvedValue(testCompany);

      const request = new NextRequest('http://localhost:3000/api/auth/verify-domain?token=test-token-123');

      const response = await verifyDomainGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.company.id).toBe(testCompany.id);
      expect(data.company.name).toBe('Test Company');
      expect(data.company.domain).toBe('testcompany.com');
      expect(data.company.domainVerified).toBe(false);
    });

    it('should reject missing token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/verify-domain');

      const response = await verifyDomainGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Verification token is required');
    });
  });

  describe('POST /api/auth/send-domain-verification', () => {
    it('should send verification email for valid company', async () => {
      // Mock Prisma operations
      const companyWithUsers = { ...testCompany, users: [testUser] };
      const mockPrisma = require('@/lib/prisma').prisma;
      mockPrisma.company.findUnique.mockResolvedValue(companyWithUsers);
      mockPrisma.company.update.mockResolvedValue(testCompany);

      // Mock Resend
      const mockSend = jest.fn().mockImplementation(() => 
        Promise.resolve({ data: { id: 'email-123' }, error: null })
      );
      
      jest.mocked(require('resend').Resend).mockImplementation(() => ({
        emails: {
          send: mockSend
        }
      }) as any);

      const request = new NextRequest('http://localhost:3000/api/auth/send-domain-verification', {
        method: 'POST',
        body: JSON.stringify({ companyId: testCompany.id }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await sendVerificationPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Domain verification email sent successfully');
      expect(data.email).toBe('admin@testcompany.com');
    });

    it('should reject non-existent company', async () => {
      // Mock Prisma to return null (company not found)
      const mockPrisma = require('@/lib/prisma').prisma;
      mockPrisma.company.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/send-domain-verification', {
        method: 'POST',
        body: JSON.stringify({ companyId: 'non-existent-id' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await sendVerificationPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Company not found');
    });

    it('should reject already verified company', async () => {
      // Mock Prisma to return already verified company
      const verifiedCompany = { ...testCompany, domainVerified: true, domainVerifiedAt: new Date(), users: [testUser] };
      const mockPrisma = require('@/lib/prisma').prisma;
      mockPrisma.company.findUnique.mockResolvedValue(verifiedCompany);

      const request = new NextRequest('http://localhost:3000/api/auth/send-domain-verification', {
        method: 'POST',
        body: JSON.stringify({ companyId: testCompany.id }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await sendVerificationPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Domain is already verified');
    });
  });
});