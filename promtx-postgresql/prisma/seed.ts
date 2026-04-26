import { PrismaClient } from '@prisma/client'

declare const process: any;
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
