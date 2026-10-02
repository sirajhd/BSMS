import type { User, CustomerProfile, Barber } from '../types';

export interface MockUserSession {
  user: User;
  profile?: CustomerProfile | Barber;
  token: string;
}

// Development test accounts representing all three system roles
export const MOCK_ACCOUNTS: Array<{
  email: string;
  passwordHashMock: string;
  session: MockUserSession;
}> = [
  {
    email: 'admin@barbershop.com',
    passwordHashMock: 'Admin123!',
    session: {
      user: {
        id: 'user-admin-1',
        email: 'admin@barbershop.com',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-01-01T08:00:00Z',
        updatedAt: '2026-01-01T08:00:00Z',
      },
      token: 'mock-jwt-admin-token-xyz',
    },
  },
  {
    email: 'barber@barbershop.com',
    passwordHashMock: 'Barber123!',
    session: {
      user: {
        id: 'user-barber-1',
        email: 'barber@barbershop.com',
        role: 'BARBER',
        isActive: true,
        createdAt: '2026-01-01T08:00:00Z',
        updatedAt: '2026-01-01T08:00:00Z',
      },
      profile: {
        id: 'barber-profile-1',
        userId: 'user-barber-1',
        fullName: 'Marcus Vance',
        phone: '+251911223344',
        profileImage: '',
        isActive: true,
        createdAt: '2026-01-01T08:00:00Z',
        updatedAt: '2026-01-01T08:00:00Z',
      },
      token: 'mock-jwt-barber-token-xyz',
    },
  },
  {
    email: 'customer@barbershop.com',
    passwordHashMock: 'Customer123!',
    session: {
      user: {
        id: 'user-customer-1',
        email: 'customer@barbershop.com',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '2026-01-01T08:00:00Z',
        updatedAt: '2026-01-01T08:00:00Z',
      },
      profile: {
        id: 'customer-profile-1',
        userId: 'user-customer-1',
        fullName: 'Johnathan Doe',
        phone: '+251922334455',
        profileImage: '',
        createdAt: '2026-01-01T08:00:00Z',
        updatedAt: '2026-01-01T08:00:00Z',
      },
      token: 'mock-jwt-customer-token-xyz',
    },
  },
];