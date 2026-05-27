import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const pet = await prisma.pet.findFirst({
      where: { id, isActive: true },
      include: {
        owner: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        vaccinations: {
          orderBy: { dateAdministered: 'desc' },
        },
        medicalRecords: {
          orderBy: { visitDate: 'desc' },
        },
      },
    });

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    return NextResponse.json({ pet });
  } catch (error) {
    console.error('Get pet details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      species,
      breed,
      age,
      gender,
      color,
      microchipId,
      weight,
      allergies,
      complications,
    } = body;
    const { id } = await params;

    const pet = await prisma.pet.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(species !== undefined && { species }),
        ...(breed !== undefined && { breed }),
        ...(age !== undefined && { age: Number(age) }),
        ...(gender !== undefined && { gender }),
        ...(color !== undefined && { color: color || null }),
        ...(microchipId !== undefined && { microchipId: microchipId || null }),
        ...(weight !== undefined && { weight: weight !== null && weight !== '' ? parseFloat(weight.toString()) : null }),
        ...(allergies !== undefined && { allergies: allergies || null }),
        ...(complications !== undefined && { complications: complications || null }),
      },
      include: {
        owner: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        vaccinations: {
          orderBy: { dateAdministered: 'desc' },
        },
        medicalRecords: {
          orderBy: { visitDate: 'desc' },
        },
      },
    });

    return NextResponse.json({ pet });
  } catch (error) {
    console.error('Update pet error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    
    // Soft delete the pet by setting isActive to false
    await prisma.pet.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Pet deleted successfully' });
  } catch (error) {
    console.error('Delete pet error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

