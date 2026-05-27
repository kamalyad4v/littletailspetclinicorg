import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { parseQuantityNumber } from '@/lib/utils';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Calculate today's date range (start of day to end of day)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Get dashboard stats
    const [
      totalUsers,
      totalPets,
      totalAppointments,
      pendingAppointments,
      approvedAppointments,
      completedAppointments,
      medicinesForLowStock,
      expiringMedicinesCount,
      recentAppointments,
      recentUsers,
      todaysAppointments,
      upcomingVaccinationReminders,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.pet.count({ where: { isActive: true } }),
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: 'PENDING' } }),
      prisma.appointment.count({ where: { status: 'APPROVED' } }),
      prisma.appointment.count({ where: { status: 'COMPLETED' } }),
      prisma.medicine.findMany({
        where: { isActive: true },
        select: { quantity: true, minStock: true },
      }),
      prisma.medicine.count({
        where: {
          isActive: true,
          expiryDate: {
            lte: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.appointment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          pet: { select: { name: true, species: true } },
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.user.findMany({
        take: 5,
        where: { role: 'USER' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          _count: { select: { pets: true } },
        },
      }),
      // Today's approved appointments - sorted by time
      prisma.appointment.findMany({
        where: {
          date: {
            gte: todayStart,
            lt: todayEnd,
          },
          status: 'APPROVED',
        },
        orderBy: { time: 'asc' },
        include: {
          pet: { select: { name: true, species: true, breed: true } },
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        },
      }),
      // Vaccination reminders - upcoming + overdue (up to 90 days past due)
      prisma.vaccination.findMany({
        where: {
          nextDueDate: {
            gte: new Date(todayStart.getTime() - 90 * 24 * 60 * 60 * 1000), // include up to 90 days overdue
          },
        },
        orderBy: { nextDueDate: 'asc' },
        take: 30,
        include: {
          pet: {
            select: {
              id: true,
              registrationNo: true,
              name: true,
              species: true,
              breed: true,
              owner: {
                select: { firstName: true, lastName: true, email: true, phone: true },
              },
            },
          },
        },
      }),
    ]);

    const lowStockMedicines = (medicinesForLowStock as { quantity: string; minStock: string }[]).filter((m) => {
      const q = parseQuantityNumber(m.quantity);
      const min = parseQuantityNumber(m.minStock);
      return q <= min;
    }).length;

    // Get appointment stats by service type
    const serviceStats = await prisma.appointment.groupBy({
      by: ['serviceType'],
      _count: { serviceType: true },
    });

    // Get monthly appointment trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyAppointments = await prisma.appointment.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, status: true },
    });

    // Process monthly data
    const monthlyData: Record<string, number> = {};
    monthlyAppointments.forEach((apt) => {
      const month = apt.createdAt.toISOString().substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalPets,
        totalAppointments,
        pendingAppointments,
        approvedAppointments,
        completedAppointments,
        lowStockMedicines,
        expiringMedicinesCount,
      },
      serviceStats,
      monthlyData,
      recentAppointments,
      recentUsers,
      todaysAppointments,
      upcomingVaccinationReminders,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
