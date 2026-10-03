import {
  PrismaClient,
  Role,
  TenantStatus,
  SubscriptionStatus,
  PlanInterval,
  NotificationType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Refusing to run development seed with demo credentials in production. Database seeding with default passwords is permanently disabled in production environments.');
    process.exit(1);
  }

  console.log('🌱 Starting multi-tenant database seeding...');

  // Hash standard development passwords
  const superAdminPasswordHash = await bcrypt.hash('SuperAdmin123!', 10);
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const managerPasswordHash = await bcrypt.hash('Manager123!', 10);
  const barberPasswordHash = await bcrypt.hash('Barber123!', 10);
  const customerPasswordHash = await bcrypt.hash('Customer123!', 10);

  // 1. Seed SaaS Subscription Plans
  const starterPlan = await prisma.plan.upsert({
    where: { slug: 'starter' },
    update: {},
    create: {
      name: 'Starter Tier',
      slug: 'starter',
      description: 'Essential booking and schedule management for boutique barbers.',
      price: 499.0, // ETB / month
      interval: PlanInterval.MONTHLY,
      maxBarbers: 2,
      maxMonthlyAppointments: 200,
      features: JSON.stringify(['ONLINE_BOOKING', 'APPOINTMENTS', 'BASIC_REPORTS']),
      isActive: true,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { slug: 'pro' },
    update: {},
    create: {
      name: 'Professional Tier',
      slug: 'pro',
      description: 'Advanced multi-chair scheduling, automated notifications, and staff analytics.',
      price: 1200.0, // ETB / month
      interval: PlanInterval.MONTHLY,
      maxBarbers: 10,
      maxMonthlyAppointments: 2000,
      features: JSON.stringify(['ONLINE_BOOKING', 'APPOINTMENTS', 'ADVANCED_REPORTS', 'CUSTOM_BRANDING', 'WALK_INS', 'AUDIT_LOGS']),
      isActive: true,
    },
  });
  console.log('✅ Subscription plans seeded.');

  // 2. Seed Primary Demo Tenant: Crown & Blade (demo-shop)
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo-shop' },
    update: {
      name: 'Crown & Blade Barbershop',
      email: 'contact@crownandblade.com',
      phone: '+251 91 100 2233',
      address: 'Bole Medhanialem, Suite 402, Addis Ababa',
      status: TenantStatus.ACTIVE,
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
    },
    create: {
      name: 'Crown & Blade Barbershop',
      slug: 'demo-shop',
      email: 'contact@crownandblade.com',
      phone: '+251 91 100 2233',
      address: 'Bole Medhanialem, Suite 402, Addis Ababa',
      status: TenantStatus.ACTIVE,
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
      settings: {
        create: {
          primaryColor: '#d97706',
          secondaryColor: '#0f172a',
          bookingNoticeHours: 1,
          maxAdvanceBookingDays: 30,
          cancellationCutoffHours: 2,
          allowWalkIns: true,
        },
      },
      subscriptions: {
        create: {
          planId: proPlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });
  console.log(`✅ Demo tenant seeded: ${demoTenant.name} (${demoTenant.slug})`);

  // 3. Seed Secondary Demo Tenant for Multi-Tenancy & Isolation Verification: Downtown Cuts
  const secondaryTenant = await prisma.tenant.upsert({
    where: { slug: 'downtown-cuts' },
    update: {},
    create: {
      name: 'Downtown Cuts & Shave',
      slug: 'downtown-cuts',
      email: 'info@downtowncuts.com',
      phone: '+251 92 200 4455',
      address: 'Piazza, Churchill Ave, Addis Ababa',
      status: TenantStatus.ACTIVE,
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
      settings: {
        create: {
          primaryColor: '#0284c7',
          secondaryColor: '#0f172a',
          bookingNoticeHours: 2,
          maxAdvanceBookingDays: 14,
          cancellationCutoffHours: 4,
          allowWalkIns: false,
        },
      },
      subscriptions: {
        create: {
          planId: starterPlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });
  console.log(`✅ Secondary tenant seeded: ${secondaryTenant.name} (${secondaryTenant.slug})`);

  // 4. Seed Platform SUPER_ADMIN
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@bsms.com' },
    update: {},
    create: {
      email: 'superadmin@bsms.com',
      passwordHash: superAdminPasswordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Platform Super Admin account seeded: ${superAdminUser.email}`);

  // 5. Seed / Migrate Existing Admin Account (SHOP_OWNER of demo-shop & platform admin)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@barbershop.com' },
    update: {
      role: Role.SHOP_OWNER,
    },
    create: {
      email: 'admin@barbershop.com',
      passwordHash: adminPasswordHash,
      role: Role.SHOP_OWNER,
      isActive: true,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: adminUser.id,
        tenantId: demoTenant.id,
      },
    },
    update: { role: Role.SHOP_OWNER },
    create: {
      userId: adminUser.id,
      tenantId: demoTenant.id,
      role: Role.SHOP_OWNER,
      isActive: true,
    },
  });
  console.log(`✅ Shop Owner account seeded: ${adminUser.email}`);

  // 6. Seed Shop Manager
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@barbershop.com' },
    update: {},
    create: {
      email: 'manager@barbershop.com',
      passwordHash: managerPasswordHash,
      role: Role.MANAGER,
      isActive: true,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: managerUser.id,
        tenantId: demoTenant.id,
      },
    },
    update: { role: Role.MANAGER },
    create: {
      userId: managerUser.id,
      tenantId: demoTenant.id,
      role: Role.MANAGER,
      isActive: true,
    },
  });
  console.log(`✅ Shop Manager account seeded: ${managerUser.email}`);

  // 7. Seed Barbers for demo-shop
  // Barber 1: Marcus Vance
  const barberUser1 = await prisma.user.upsert({
    where: { email: 'barber@barbershop.com' },
    update: { role: Role.BARBER },
    create: {
      email: 'barber@barbershop.com',
      passwordHash: barberPasswordHash,
      role: Role.BARBER,
      isActive: true,
      barberProfile: {
        create: {
          fullName: 'Marcus Vance',
          phone: '+251 91 122 3344',
          tenantId: demoTenant.id,
          isActive: true,
        },
      },
    },
    include: { barberProfile: true },
  });

  if (barberUser1.barberProfile && !barberUser1.barberProfile.tenantId) {
    await prisma.barber.update({
      where: { id: barberUser1.barberProfile.id },
      data: { tenantId: demoTenant.id },
    });
  }

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: barberUser1.id,
        tenantId: demoTenant.id,
      },
    },
    update: { role: Role.BARBER },
    create: {
      userId: barberUser1.id,
      tenantId: demoTenant.id,
      role: Role.BARBER,
      isActive: true,
    },
  });

  // Barber 2: Elias Thorne
  const barberUser2 = await prisma.user.upsert({
    where: { email: 'elias@barbershop.com' },
    update: { role: Role.BARBER },
    create: {
      email: 'elias@barbershop.com',
      passwordHash: barberPasswordHash,
      role: Role.BARBER,
      isActive: true,
      barberProfile: {
        create: {
          fullName: 'Elias Thorne',
          phone: '+251 92 233 4455',
          tenantId: demoTenant.id,
          isActive: true,
        },
      },
    },
    include: { barberProfile: true },
  });

  if (barberUser2.barberProfile && !barberUser2.barberProfile.tenantId) {
    await prisma.barber.update({
      where: { id: barberUser2.barberProfile.id },
      data: { tenantId: demoTenant.id },
    });
  }

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: barberUser2.id,
        tenantId: demoTenant.id,
      },
    },
    update: { role: Role.BARBER },
    create: {
      userId: barberUser2.id,
      tenantId: demoTenant.id,
      role: Role.BARBER,
      isActive: true,
    },
  });

  // Barber 3: Dawit Kassahun (Inactive example)
  const barberUser3 = await prisma.user.upsert({
    where: { email: 'dawit@barbershop.com' },
    update: { role: Role.BARBER },
    create: {
      email: 'dawit@barbershop.com',
      passwordHash: barberPasswordHash,
      role: Role.BARBER,
      isActive: false,
      barberProfile: {
        create: {
          fullName: 'Dawit Kassahun',
          phone: '+251 93 344 5566',
          tenantId: demoTenant.id,
          isActive: false,
        },
      },
    },
    include: { barberProfile: true },
  });

  if (barberUser3.barberProfile && !barberUser3.barberProfile.tenantId) {
    await prisma.barber.update({
      where: { id: barberUser3.barberProfile.id },
      data: { tenantId: demoTenant.id },
    });
  }

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: barberUser3.id,
        tenantId: demoTenant.id,
      },
    },
    update: { role: Role.BARBER },
    create: {
      userId: barberUser3.id,
      tenantId: demoTenant.id,
      role: Role.BARBER,
      isActive: false,
    },
  });
  console.log('✅ Demo shop barbers seeded.');

  // Barber for Secondary Tenant (Downtown Cuts)
  const secondaryBarberUser = await prisma.user.upsert({
    where: { email: 'samuel@downtowncuts.com' },
    update: {},
    create: {
      email: 'samuel@downtowncuts.com',
      passwordHash: barberPasswordHash,
      role: Role.BARBER,
      isActive: true,
      barberProfile: {
        create: {
          fullName: 'Samuel Haile',
          phone: '+251 94 455 6677',
          tenantId: secondaryTenant.id,
          isActive: true,
        },
      },
    },
    include: { barberProfile: true },
  });

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: secondaryBarberUser.id,
        tenantId: secondaryTenant.id,
      },
    },
    update: { role: Role.BARBER },
    create: {
      userId: secondaryBarberUser.id,
      tenantId: secondaryTenant.id,
      role: Role.BARBER,
      isActive: true,
    },
  });
  console.log('✅ Secondary tenant barber seeded.');

  // 8. Seed Customer: Johnathan Doe
  const customerUser1 = await prisma.user.upsert({
    where: { email: 'customer@barbershop.com' },
    update: { role: Role.CUSTOMER },
    create: {
      email: 'customer@barbershop.com',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      isActive: true,
      customerProfile: {
        create: {
          fullName: 'Johnathan Doe',
          phone: '+251 92 233 4455',
          tenantId: demoTenant.id,
        },
      },
    },
    include: { customerProfile: true },
  });

  if (customerUser1.customerProfile && !customerUser1.customerProfile.tenantId) {
    await prisma.customerProfile.update({
      where: { id: customerUser1.customerProfile.id },
      data: { tenantId: demoTenant.id },
    });
  }

  await prisma.membership.upsert({
    where: {
      userId_tenantId: {
        userId: customerUser1.id,
        tenantId: demoTenant.id,
      },
    },
    update: { role: Role.CUSTOMER },
    create: {
      userId: customerUser1.id,
      tenantId: demoTenant.id,
      role: Role.CUSTOMER,
      isActive: true,
    },
  });
  console.log(`✅ Customer account seeded: ${customerUser1.email}`);

  // 9. Seed Services for demo-shop
  const services = [
    {
      name: 'Classic Precision Haircut',
      description: 'Bespoke shear and clipper haircut tailored to your head shape, completed with neck shave and hot towel finish.',
      price: 350.0,
      durationMinutes: 30,
      isActive: true,
    },
    {
      name: 'Signature Beard Sculpt & Conditioning',
      description: 'Detailed beard lineup, precision trimming, organic beard butter treatment, and straight razor edge detail.',
      price: 250.0,
      durationMinutes: 25,
      isActive: true,
    },
    {
      name: 'Executive Cut & Hot Towel Shave',
      description: 'Full signature haircut, invigorating scalp massage, and authentic hot lather traditional straight razor face shave.',
      price: 550.0,
      durationMinutes: 50,
      isActive: true,
    },
    {
      name: 'Scalp Detox & Deep Conditioning Wash',
      description: 'Invigorating tea tree hair wash, clarifying scalp exfoliation, and rejuvenating massage.',
      price: 200.0,
      durationMinutes: 20,
      isActive: true,
    },
    {
      name: 'Father & Son Duo Package',
      description: 'Full classic haircut and styling for one adult and one child under 12.',
      price: 600.0,
      durationMinutes: 60,
      isActive: false,
    },
  ];

  for (const srv of services) {
    const existing = await prisma.service.findFirst({
      where: { name: srv.name, tenantId: demoTenant.id },
    });
    if (!existing) {
      await prisma.service.create({
        data: {
          ...srv,
          tenantId: demoTenant.id,
        },
      });
    }
  }

  // Seed sample service for secondary tenant
  const existingSecondaryService = await prisma.service.findFirst({
    where: { name: 'Downtown Express Trim', tenantId: secondaryTenant.id },
  });
  if (!existingSecondaryService) {
    await prisma.service.create({
      data: {
        name: 'Downtown Express Trim',
        description: 'Quick clean clipper fade and neck edge cleanup.',
        price: 200.0,
        durationMinutes: 20,
        isActive: true,
        tenantId: secondaryTenant.id,
      },
    });
  }
  console.log('✅ Services seeded for all tenants.');

  // 10. Seed Business Schedule for demo-shop
  const businessSchedules = [
    { dayOfWeek: 0, isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { dayOfWeek: 1, isOpen: true, openTime: '08:30', closeTime: '19:30' },
    { dayOfWeek: 2, isOpen: true, openTime: '08:30', closeTime: '19:30' },
    { dayOfWeek: 3, isOpen: true, openTime: '08:30', closeTime: '19:30' },
    { dayOfWeek: 4, isOpen: true, openTime: '08:30', closeTime: '19:30' },
    { dayOfWeek: 5, isOpen: true, openTime: '08:30', closeTime: '20:00' },
    { dayOfWeek: 6, isOpen: true, openTime: '08:00', closeTime: '20:00' },
  ];

  for (const schedule of businessSchedules) {
    await prisma.businessSchedule.upsert({
      where: {
        tenantId_dayOfWeek: {
          tenantId: demoTenant.id,
          dayOfWeek: schedule.dayOfWeek,
        },
      },
      update: schedule,
      create: {
        ...schedule,
        tenantId: demoTenant.id,
      },
    });
  }
  console.log('✅ Business schedules seeded.');

  // 11. Seed Barber Weekly Availability
  if (barberUser1.barberProfile) {
    const marcusAvailability = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 6, startTime: '09:00', endTime: '16:00' },
    ];
    for (const win of marcusAvailability) {
      await prisma.barberAvailability.upsert({
        where: {
          barberId_dayOfWeek: {
            barberId: barberUser1.barberProfile.id,
            dayOfWeek: win.dayOfWeek,
          },
        },
        update: win,
        create: {
          barberId: barberUser1.barberProfile.id,
          ...win,
        },
      });
    }
  }

  // 12. Seed Sample Notification for Customer
  await prisma.notification.create({
    data: {
      userId: customerUser1.id,
      tenantId: demoTenant.id,
      title: 'Welcome to Crown & Blade',
      message: 'Your account has been created. You can now book haircuts and grooming services seamlessly.',
      type: NotificationType.BOOKING_CONFIRMED,
      isRead: false,
    },
  });

  // 13. Seed Initial Audit Log
  await prisma.auditLog.create({
    data: {
      tenantId: demoTenant.id,
      actorUserId: superAdminUser.id,
      action: 'TENANT_INITIALIZED',
      entity: 'Tenant',
      entityId: demoTenant.id,
      metadata: JSON.stringify({ name: demoTenant.name, plan: 'PRO' }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('✨ Multi-Tenant SaaS Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
