import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { parseQuantityNumber } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = await params;
    const {
      vaccineName,
      dateAdministered,
      nextDueDate,
      batchNumber,
      veterinarian,
      notes,
      prescribedMedicines,
    } = body;

    if (!vaccineName || !dateAdministered) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (prescribedMedicines && prescribedMedicines.length > 0) {
      for (const item of prescribedMedicines) {
        if (!item.medicineId || !item.quantity || item.quantity <= 0) continue;

        const med = await prisma.medicine.findUnique({
          where: { id: item.medicineId }
        });

        if (!med) {
          throw new Error(`Medicine with ID ${item.medicineId} not found`);
        }
        const availableQty = parseQuantityNumber(med.quantity);
        if (availableQty < item.quantity) {
          throw new Error(`Insufficient stock for ${med.name}. Available: ${med.quantity} ${med.unit}, requested: ${item.quantity}`);
        }

        // Extract number and suffix (like ^5 or *100) from med.quantity
        const match = String(med.quantity).match(/^(\d+)(.*)$/);
        let newQuantity = String(Math.max(0, availableQty - item.quantity));
        if (match && match[2]) {
          const numPart = parseInt(match[1]);
          const suffix = match[2];
          newQuantity = `${Math.max(0, numPart - item.quantity)}${suffix}`;
        }

        // Update medicine stock
        await prisma.medicine.update({
          where: { id: item.medicineId },
          data: {
            quantity: newQuantity
          }
        });
      }
    }

    await prisma.vaccination.create({
      data: {
        vaccineName,
        dateAdministered: new Date(dateAdministered),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        batchNumber: batchNumber || null,
        veterinarian: veterinarian || null,
        notes: notes || null,
        petId: id,
      },
    });

    if (nextDueDate) {
      const targetPet = await prisma.pet.findUnique({
        where: { id },
        include: { owner: true }
      });

      if (targetPet) {
        const ownerName = `${targetPet.owner.firstName} ${targetPet.owner.lastName}`;
        const formattedNextDue = new Date(nextDueDate).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Create reminder
        await prisma.reminder.create({
          data: {
            petId: id,
            type: 'VACCINATION',
            title: `Vaccination Due: ${targetPet.name}`,
            message: `${targetPet.name}'s next vaccination (${vaccineName}) is due on ${formattedNextDue}. Owner: ${ownerName}.`,
            dueDate: new Date(nextDueDate),
          },
        });

        // Create in-app notification
        await prisma.notification.create({
          data: {
            userId: targetPet.ownerId,
            title: 'Next Vaccination Scheduled',
            message: `${targetPet.name}'s vaccination is complete! Next vaccination is due on ${formattedNextDue}.`,
            type: 'IN_APP',
          },
        });
      }
    }

    const pet = await prisma.pet.findUnique({
      where: { id },
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
    console.error('Add vaccination error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('not found') || message.includes('Insufficient stock')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
