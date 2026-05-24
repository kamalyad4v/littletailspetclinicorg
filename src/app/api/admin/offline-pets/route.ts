import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      // Owner info
      ownerFirstName,
      ownerLastName,
      ownerEmail,
      ownerPhone,
      // Pet info
      petName,
      species,
      breed,
      age,
      weight,
      gender,
      color,
      microchipId,
      allergies,
      complications,
      ownerPassword,
    } = body;

    // Validate required fields
    if (!ownerPhone || !ownerFirstName || !ownerLastName || !petName || !species || !breed || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find or create the owner user
    let owner = await prisma.user.findUnique({ where: { phone: ownerPhone } });

    if (!owner) {
      // Create a new user account for the pet parent
      const tempPassword = await hashPassword(ownerPassword && ownerPassword.length >= 6 ? ownerPassword : `LittleTails@${Math.random().toString(36).slice(2, 8)}`);
      owner = await prisma.user.create({
        data: {
          email: ownerEmail || null,
          password: tempPassword,
          firstName: ownerFirstName,
          lastName: ownerLastName,
          phone: ownerPhone,
          role: 'USER',
          isActive: true,
        },
      });
    } else {
      // Update email if provided and not already set
      if (ownerEmail && !owner.email) {
        owner = await prisma.user.update({
          where: { id: owner.id },
          data: { email: ownerEmail },
        });
      }
    }

    // Create the pet linked to the owner
    const pet = await prisma.pet.create({
      data: {
        name: petName,
        species,
        breed,
        age: parseInt(age),
        weight: weight ? parseFloat(weight) : null,
        gender,
        color: color || null,
        microchipId: microchipId || null,
        allergies: allergies || null,
        complications: complications || null,
        ownerId: owner.id,
        isActive: true,
      },
      include: {
        owner: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });

    return NextResponse.json({ pet, ownerCreated: !body._existingOwner }, { status: 201 });
  } catch (error) {
    console.error('Offline pet registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone') || '';

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        _count: { select: { pets: true } },
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Owner lookup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
