import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const count = await prisma.medicine.count({
      where: {
        isActive: true,
        expiryDate: {
          lte: thirtyDaysFromNow,
        },
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Get expiring count error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
