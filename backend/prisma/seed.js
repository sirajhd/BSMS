import { PrismaClient, Role, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    // Hash standard development passwords
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const barberPasswordHash = await bcrypt.hash('Barber123!', 10);
    const customerPasswordHash = await bcrypt.hash('Customer123!', 10);
    // 1. Seed Users & Profiles
    // Admin User
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@barbershop.com' },
        update: {},
        create: {
            email: 'admin@barbershop.com',
            passwordHash: adminPasswordHash,
            role: Role.ADMIN,
            isActive: true,
        },
    });
    console.log(`✅ Admin account seeded: ${adminUser.email}`);
    // Barber User 1: Marcus Vance
    const barberUser1 = await prisma.user.upsert({
        where: { email: 'barber@barbershop.com' },
        update: {},
        create: {
            email: 'barber@barbershop.com',
            passwordHash: barberPasswordHash,
            role: Role.BARBER,
            isActive: true,
            barberProfile: {
                create: {
                    fullName: 'Marcus Vance',
                    phone: '+251 91 122 3344',
                    isActive: true,
                },
            },
        },
        include: { barberProfile: true },
    });
    // Barber User 2: Elias Thorne
    const barberUser2 = await prisma.user.upsert({
        where: { email: 'elias@barbershop.com' },
        update: {},
        create: {
            email: 'elias@barbershop.com',
            passwordHash: barberPasswordHash,
            role: Role.BARBER,
            isActive: true,
            barberProfile: {
                create: {
                    fullName: 'Elias Thorne',
                    phone: '+251 92 233 4455',
                    isActive: true,
                },
            },
        },
        include: { barberProfile: true },
    });
    // Barber User 3: Dawit Kassahun (Inactive example)
    const barberUser3 = await prisma.user.upsert({
        where: { email: 'dawit@barbershop.com' },
        update: {},
        create: {
            email: 'dawit@barbershop.com',
            passwordHash: barberPasswordHash,
            role: Role.BARBER,
            isActive: false,
            barberProfile: {
                create: {
                    fullName: 'Dawit Kassahun',
                    phone: '+251 93 344 5566',
                    isActive: false,
                },
            },
        },
        include: { barberProfile: true },
    });
    console.log('✅ Barber accounts seeded.');
    // Customer User 1: Johnathan Doe
    const customerUser1 = await prisma.user.upsert({
        where: { email: 'customer@barbershop.com' },
        update: {},
        create: {
            email: 'customer@barbershop.com',
            passwordHash: customerPasswordHash,
            role: Role.CUSTOMER,
            isActive: true,
            customerProfile: {
                create: {
                    fullName: 'Johnathan Doe',
                    phone: '+251 92 233 4455',
                },
            },
        },
        include: { customerProfile: true },
    });
    console.log(`✅ Customer account seeded: ${customerUser1.email}`);
    // 2. Seed Services (Pricing in ETB)
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
        const existing = await prisma.service.findFirst({ where: { name: srv.name } });
        if (!existing) {
            await prisma.service.create({ data: srv });
        }
    }
    console.log('✅ Services seeded.');
    // 3. Seed Business Schedule (0 = Sunday ... 6 = Saturday)
    const businessSchedules = [
        { dayOfWeek: 0, isOpen: true, openTime: '09:00', closeTime: '17:00' }, // Sunday
        { dayOfWeek: 1, isOpen: true, openTime: '08:30', closeTime: '19:30' }, // Monday
        { dayOfWeek: 2, isOpen: true, openTime: '08:30', closeTime: '19:30' }, // Tuesday
        { dayOfWeek: 3, isOpen: true, openTime: '08:30', closeTime: '19:30' }, // Wednesday
        { dayOfWeek: 4, isOpen: true, openTime: '08:30', closeTime: '19:30' }, // Thursday
        { dayOfWeek: 5, isOpen: true, openTime: '08:30', closeTime: '20:00' }, // Friday
        { dayOfWeek: 6, isOpen: true, openTime: '08:00', closeTime: '20:00' }, // Saturday
    ];
    for (const schedule of businessSchedules) {
        await prisma.businessSchedule.upsert({
            where: { dayOfWeek: schedule.dayOfWeek },
            update: schedule,
            create: schedule,
        });
    }
    console.log('✅ Business schedule seeded.');
    // 4. Seed Barber Availability Windows
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
    if (barberUser2.barberProfile) {
        const eliasAvailability = [
            { dayOfWeek: 0, startTime: '10:00', endTime: '16:00' },
            { dayOfWeek: 2, startTime: '10:00', endTime: '19:00' },
            { dayOfWeek: 3, startTime: '10:00', endTime: '19:00' },
            { dayOfWeek: 4, startTime: '10:00', endTime: '19:00' },
            { dayOfWeek: 5, startTime: '10:00', endTime: '19:00' },
            { dayOfWeek: 6, startTime: '10:00', endTime: '19:00' },
        ];
        for (const win of eliasAvailability) {
            await prisma.barberAvailability.upsert({
                where: {
                    barberId_dayOfWeek: {
                        barberId: barberUser2.barberProfile.id,
                        dayOfWeek: win.dayOfWeek,
                    },
                },
                update: win,
                create: {
                    barberId: barberUser2.barberProfile.id,
                    ...win,
                },
            });
        }
    }
    console.log('✅ Barber weekly availability windows seeded.');
    // 5. Seed Sample Notification
    await prisma.notification.create({
        data: {
            userId: customerUser1.id,
            title: 'Welcome to Crown & Blade',
            message: 'Your account has been created. You can now book haircuts and grooming services seamlessly.',
            type: NotificationType.BOOKING_CONFIRMED,
            isRead: false,
        },
    });
    console.log('✨ Seeding finished successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
