import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const pets = await prisma.pet.findMany({
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    console.log('Total pets:', pets.length);
    if (pets.length > 0) {
      console.log('First pet:', JSON.stringify(pets[0], null, 2));
      console.log('\nAll pet IDs:', pets.map(p => p.id));
    } else {
      console.log('No pets found in database');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
