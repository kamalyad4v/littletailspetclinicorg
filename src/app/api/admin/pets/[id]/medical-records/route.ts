import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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

    const pet = await prisma.$transaction(async (tx) => {
      let finalPrescription = prescription || '';

      if (prescribedMedicines && prescribedMedicines.length > 0) {
        const stockDetails: string[] = [];
        for (const item of prescribedMedicines) {
          if (!item.medicineId || !item.quantity || item.quantity <= 0) continue;

          const med = await tx.medicine.findUnique({
            where: { id: item.medicineId }
          });

          if (!med) {
            throw new Error(`Medicine with ID ${item.medicineId} not found`);
          }
          if (med.quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${med.name}. Available: ${med.quantity} ${med.unit}, requested: ${item.quantity}`);
          }

          stockDetails.push(`${med.name} - ${item.quantity} ${med.unit}`);

          // Update medicine stock
          await tx.medicine.update({
            where: { id: item.medicineId },
            data: {
              quantity: {
                decrement: item.quantity
              }
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

      await tx.medicalRecord.create({
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

      return await tx.pet.findUnique({
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
