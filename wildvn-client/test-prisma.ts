import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  try {
    const res = await prisma.userFavorite.findMany();
    console.log("Success:", res);
  } catch (e) {
    console.error("Prisma Error:", e);
  } finally {
    await prisma.$disconnect()
  }
}
main()
