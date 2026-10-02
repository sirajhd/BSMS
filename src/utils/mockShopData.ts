import type {
  Service,
  Barber,
  BusinessSchedule,
  BarberAvailability,
  Appointment,
} from '../types';

// Pre-seeded Active Services (Prices strictly in ETB)
export const MOCK_SERVICES: Service[] = [
  {
    id: 'srv-1',
    name: 'Classic Precision Haircut',
    description: 'Bespoke shear and clipper haircut tailored to your head shape, completed with neck shave and hot towel finish.',
    price: 350,
    durationMinutes: 30,
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'srv-2',
    name: 'Signature Beard Sculpt & Conditioning',
    description: 'Detailed beard lineup, precision trimming, organic beard butter treatment, and straight razor edge detail.',
    price: 250,
    durationMinutes: 25,
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'srv-3',
    name: 'Executive Cut & Hot Towel Shave',
    description: 'Full signature haircut, invigorating scalp massage, and authentic hot lather traditional straight razor face shave.',
    price: 550,
    durationMinutes: 50,
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'srv-4',
    name: 'Scalp Detox & Deep Conditioning Wash',
    description: 'Invigorating tea tree hair wash, clarifying scalp exfoliation, and rejuvenating massage.',
    price: 200,
    durationMinutes: 20,
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'srv-5',
    name: 'Father & Son Duo Package',
    description: 'Full classic haircut and styling for one adult and one child under 12.',
    price: 600,
    durationMinutes: 60,
    isActive: false, // Inactive example to test filtering
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
];

// Pre-seeded Barbers
export const MOCK_BARBERS: Barber[] = [
  {
    id: 'barber-profile-1',
    userId: 'user-barber-1',
    fullName: 'Marcus Vance',
    phone: '+251 91 122 3344',
    profileImage: '',
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'barber-profile-2',
    userId: 'user-barber-2',
    fullName: 'Elias Thorne',
    phone: '+251 92 233 4455',
    profileImage: '',
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'barber-profile-3',
    userId: 'user-barber-3',
    fullName: 'Dawit Kassahun',
    phone: '+251 93 344 5566',
    profileImage: '',
    isActive: false, // Inactive barber example to verify customer selection guards
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
];

// Business Working Hours (0 = Sunday ... 6 = Saturday)
export const MOCK_BUSINESS_SCHEDULE: BusinessSchedule[] = [
  { id: 'bs-0', dayOfWeek: 0, isOpen: true, openTime: '09:00', closeTime: '17:00' }, // Sunday
  { id: 'bs-1', dayOfWeek: 1, isOpen: true, openTime: '08:30', closeTime: '19:30' }, // Monday
  { id: 'bs-2', dayOfWeek: 2, isOpen: true, openTime: '08:30', closeTime: '19:30' }, // Tuesday
  { id: 'bs-3', dayOfWeek: 3, isOpen: true, openTime: '08:30', closeTime: '19:30' }, // Wednesday
  { id: 'bs-4', dayOfWeek: 4, isOpen: true, openTime: '08:30', closeTime: '19:30' }, // Thursday
  { id: 'bs-5', dayOfWeek: 5, isOpen: true, openTime: '08:30', closeTime: '20:00' }, // Friday
  { id: 'bs-6', dayOfWeek: 6, isOpen: true, openTime: '08:00', closeTime: '20:00' }, // Saturday
];

// Barber Availability Windows
export const MOCK_BARBER_AVAILABILITY: BarberAvailability[] = [
  // Marcus Vance: Mon-Sat 09:00 - 17:00
  { id: 'ba-1-1', barberId: 'barber-profile-1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
  { id: 'ba-1-2', barberId: 'barber-profile-1', dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
  { id: 'ba-1-3', barberId: 'barber-profile-1', dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
  { id: 'ba-1-4', barberId: 'barber-profile-1', dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
  { id: 'ba-1-5', barberId: 'barber-profile-1', dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
  { id: 'ba-1-6', barberId: 'barber-profile-1', dayOfWeek: 6, startTime: '09:00', endTime: '16:00' },

  // Elias Thorne: Tue-Sun 10:00 - 19:00
  { id: 'ba-2-2', barberId: 'barber-profile-2', dayOfWeek: 2, startTime: '10:00', endTime: '19:00' },
  { id: 'ba-2-3', barberId: 'barber-profile-2', dayOfWeek: 3, startTime: '10:00', endTime: '19:00' },
  { id: 'ba-2-4', barberId: 'barber-profile-2', dayOfWeek: 4, startTime: '10:00', endTime: '19:00' },
  { id: 'ba-2-5', barberId: 'barber-profile-2', dayOfWeek: 5, startTime: '10:00', endTime: '19:00' },
  { id: 'ba-2-6', barberId: 'barber-profile-2', dayOfWeek: 6, startTime: '10:00', endTime: '19:00' },
  { id: 'ba-2-0', barberId: 'barber-profile-2', dayOfWeek: 0, startTime: '10:00', endTime: '16:00' },
];

// Pre-seeded Appointments
export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-101',
    customerId: 'user-customer-1',
    barberId: 'barber-profile-1',
    serviceId: 'srv-1',
    appointmentDate: '2026-10-02',
    startTime: '10:30',
    endTime: '11:00',
    status: 'CONFIRMED',
    paymentMethod: 'PAY_AT_SHOP',
    paymentStatus: 'PENDING',
    createdAt: '2026-09-30T09:00:00Z',
    updatedAt: '2026-09-30T09:00:00Z',
    service: MOCK_SERVICES[0],
    barber: MOCK_BARBERS[0],
    customer: {
      id: 'customer-profile-1',
      userId: 'user-customer-1',
      fullName: 'Johnathan Doe',
      phone: '+251922334455',
      createdAt: '2026-01-01T08:00:00Z',
      updatedAt: '2026-01-01T08:00:00Z',
    },
  },
  {
    id: 'apt-102',
    customerId: 'user-customer-1',
    barberId: 'barber-profile-2',
    serviceId: 'srv-2',
    appointmentDate: '2026-09-20',
    startTime: '14:00',
    endTime: '14:25',
    status: 'COMPLETED',
    paymentMethod: 'ONLINE',
    paymentStatus: 'PAID',
    createdAt: '2026-09-18T10:00:00Z',
    updatedAt: '2026-09-20T14:30:00Z',
    service: MOCK_SERVICES[1],
    barber: MOCK_BARBERS[1],
  },
];