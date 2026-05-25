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
      patientHistory,
      diagnosis,
      treatment,
      prescription,
      veterinarian,
      visitDate,
      followUpDate,
      notes,
      prescribedMedicines,
    } = body;

    if (!diagnosis || !treatment || !visitDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let finalPrescription = prescription || '';

    if (prescribedMedicines && prescribedMedicines.length > 0) {
      const stockDetails: string[] = [];
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

        stockDetails.push(`${med.name} - ${item.quantity} ${med.unit}`);

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

      if (stockDetails.length > 0) {
        const stockPrescriptionText = `Prescribed Stock Medicines:\n` + stockDetails.map(d => `• ${d}`).join('\n');
        if (finalPrescription) {
          finalPrescription = `${finalPrescription}\n\n${stockPrescriptionText}`;
        } else {
          finalPrescription = stockPrescriptionText;
        }
      }
    }

    await prisma.medicalRecord.create({
      data: {
        patientHistory: patientHistory || null,
        diagnosis,
        treatment,
        prescription: finalPrescription || null,
        veterinarian: veterinarian || null,
        visitDate: new Date(visitDate),
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes: notes || null,
        petId: id,
      },
    });

    if (followUpDate) {
      const targetPet = await prisma.pet.findUnique({
        where: { id },
        include: { owner: true }
      });

      if (targetPet) {
        const ownerName = `${targetPet.owner.firstName} ${targetPet.owner.lastName}`;
        const formattedFollowUp = new Date(followUpDate).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Create reminder for follow-up (type: HEALTH_CHECKUP)
        await prisma.reminder.create({
          data: {
            petId: id,
            type: 'HEALTH_CHECKUP',
            title: `Follow-up Visit: ${targetPet.name}`,
            message: `Follow-up check-up for ${targetPet.name} is scheduled on ${formattedFollowUp}. Diagnosis: ${diagnosis}. Owner: ${ownerName}.`,
            dueDate: new Date(followUpDate),
          },
        });

        // Create in-app notification
        await prisma.notification.create({
          data: {
            userId: targetPet.ownerId,
            title: 'Follow-up Visit Scheduled',
            message: `A follow-up visit for ${targetPet.name} has been scheduled for ${formattedFollowUp}.`,
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
    console.error('Add medical record error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('not found') || message.includes('Insufficient stock')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
