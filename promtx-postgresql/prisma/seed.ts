import { PrismaClient, UserRole, AIProvider } from '@prisma/client';

// @ts-ignore
declare const process: any;

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@promtx.os' },
    update: {},
    create: {
      id: 'system-admin-001',
      email: 'admin@promtx.os',
      displayName: 'Promtx Admin',
      role: UserRole.Admin,
      isEmailVerified: true,
    },
  });
  console.log(`Admin user seeded: ${adminUser.email}`);

  // 2. Seed Admin Wallet
  await prisma.wallet.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      credits: 10000,
      lifetimeCredits: 10000,
    },
  });

  // SuperAdmin User
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@promtx.os' },
    update: {},
    create: {
      email: 'superadmin@promtx.os',
      displayName: 'Promtx SuperAdmin',
      role: UserRole.SuperAdmin,
      isEmailVerified: true,
    },
  });
  console.log(`SuperAdmin user seeded: ${superAdmin.email}`);

  // SuperAdmin Wallet
  await prisma.wallet.upsert({
    where: { userId: superAdmin.id },
    update: {},
    create: {
      userId: superAdmin.id,
      credits: 99999,
      lifetimeCredits: 99999,
    },
  });

  // 3. Seed Global Workspace
  const globalWorkspace = await prisma.workspace.upsert({
    where: { id: 'global-workspace-001' },
    update: {},
    create: {
      id: 'global-workspace-001',
      name: 'Promtx Global',
      slug: 'global',
      ownerId: adminUser.id,
    },
  });
  console.log(`Workspace seeded: ${globalWorkspace.name}`);

  // SuperAdmin Workspace
  const superAdminWorkspace = await prisma.workspace.upsert({
    where: { slug: 'operations' },
    update: {},
    create: {
      name: 'Promtx Operations',
      slug: 'operations',
      ownerId: superAdmin.id,
    },
  });
  console.log(`SuperAdmin workspace seeded: ${superAdminWorkspace.name}`);

  // 4. Seed Workspace Member
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: globalWorkspace.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      workspaceId: globalWorkspace.id,
      userId: adminUser.id,
      role: 'Owner',
    },
  });

  // 5. Seed Pricing Matrix
  const gpt4o = await prisma.pricingMatrix.upsert({
    where: { modelId: 'gpt-4o' },
    update: {},
    create: {
      modelId: 'gpt-4o',
      provider: AIProvider.openai,
      basePrice1m: 0.00,
      outputPrice1m: 0.00,
      isActive: true,
    },
  });
  console.log(`Pricing matrix seeded: ${gpt4o.modelId}`);

  const geminiPro = await prisma.pricingMatrix.upsert({
    where: { modelId: 'gemini-1.5-pro' },
    update: {},
    create: {
      modelId: 'gemini-1.5-pro',
      provider: AIProvider.google,
      basePrice1m: 0.00,
      outputPrice1m: 0.00,
      isActive: true,
    },
  });
  console.log(`Pricing matrix seeded: ${geminiPro.modelId}`);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
