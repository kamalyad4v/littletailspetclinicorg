import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { firstName, lastName, email, phone, isActive } = body;

    // Validate required fields
    if (!firstName || !lastName || !phone) {
      return NextResponse.json({ error: 'First name, last name, and phone are required' }, { status: 400 });
    }

    // Check if phone number is already taken by another user
    const existingPhone = await prisma.user.findFirst({
      where: {
        phone,
        NOT: { id },
      },
    });
    if (existingPhone) {
      return NextResponse.json({ error: 'Phone number already in use' }, { status: 400 });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id },
        },
      });
      if (existingEmail) {
        return NextResponse.json({ error: 'Email address already in use' }, { status: 400 });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email: email || null,
        phone,
        isActive: Boolean(isActive),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
