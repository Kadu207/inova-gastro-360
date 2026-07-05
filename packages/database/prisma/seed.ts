import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../src/index";

/**
 * Senha do admin demo. Nunca versionada:
 * - CI usa SEED_ADMIN_PASSWORD (secret) ou um valor determinístico só de teste.
 * - Local/produção: definir SEED_ADMIN_PASSWORD; senão gera aleatória e imprime.
 */
function resolveDemoPassword(): string {
  if (process.env.SEED_ADMIN_PASSWORD) return process.env.SEED_ADMIN_PASSWORD;
  if (process.env.CI) return "ci-seed-password-not-for-prod";
  const generated = randomBytes(9).toString("base64url");
  console.log("\n[seed] SEED_ADMIN_PASSWORD não definido — senha gerada (guarde agora):");
  console.log(`[seed] senha admin demo: ${generated}\n`);
  return generated;
}

const DEMO_PASSWORD = resolveDemoPassword();

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-burger" },
    update: {},
    create: {
      name: "Demo Burger House",
      slug: "demo-burger",
      status: "active",
    },
  });

  const company = await prisma.company.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      tenantId: tenant.id,
      tradeName: "Demo Burger",
      legalName: "Demo Burger LTDA",
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: "00000000-0000-4000-8000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000002",
      tenantId: tenant.id,
      companyId: company.id,
      name: "Filial Centro",
      address: "Rua Demo, 100",
    },
  });

  const admin = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: "admin@inovagastro360.local" },
    },
    update: { passwordHash },
    create: {
      tenantId: tenant.id,
      email: "admin@inovagastro360.local",
      name: "Admin Demo",
      passwordHash,
      role: "admin_cliente",
    },
  });

  await prisma.userBranchAccess.upsert({
    where: {
      userId_branchId: { userId: admin.id, branchId: branch.id },
    },
    update: {},
    create: {
      userId: admin.id,
      branchId: branch.id,
      tenantId: tenant.id,
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: "superadmin@inovagastro360.local" },
    },
    update: { passwordHash, role: "super_admin" },
    create: {
      tenantId: tenant.id,
      email: "superadmin@inovagastro360.local",
      name: "Super Admin",
      passwordHash,
      role: "super_admin",
    },
  });

  await prisma.userBranchAccess.upsert({
    where: { userId_branchId: { userId: superAdmin.id, branchId: branch.id } },
    update: {},
    create: { userId: superAdmin.id, branchId: branch.id, tenantId: tenant.id },
  });

  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { code: "starter" },
    update: {
      stripePriceId: process.env.STRIPE_PRICE_STARTER ?? "price_test_starter",
    },
    create: {
      code: "starter",
      name: "Starter",
      priceCents: 0,
      maxBranches: 1,
      maxProducts: 50,
      stripePriceId: process.env.STRIPE_PRICE_STARTER ?? "price_test_starter",
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: "pro" },
    update: {
      stripePriceId: process.env.STRIPE_PRICE_PRO ?? "price_test_pro",
    },
    create: {
      code: "pro",
      name: "Pro",
      priceCents: 14900,
      maxBranches: 3,
      maxProducts: 500,
      stripePriceId: process.env.STRIPE_PRICE_PRO ?? "price_test_pro",
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: "enterprise" },
    update: {
      stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? "price_test_enterprise",
    },
    create: {
      code: "enterprise",
      name: "Enterprise",
      priceCents: 49900,
      maxBranches: 50,
      maxProducts: 5000,
      stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE ?? "price_test_enterprise",
    },
  });

  const existingSub = await prisma.subscription.findFirst({ where: { tenantId: tenant.id } });
  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: starterPlan.id,
        status: "trialing",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
  }

  const burgers = await prisma.productCategory.upsert({
    where: { id: "00000000-0000-4000-8000-000000000010" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000010",
      tenantId: tenant.id,
      branchId: branch.id,
      name: "Burgers",
      sortOrder: 1,
    },
  });

  const bebidas = await prisma.productCategory.upsert({
    where: { id: "00000000-0000-4000-8000-000000000011" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000011",
      tenantId: tenant.id,
      branchId: branch.id,
      name: "Bebidas",
      sortOrder: 2,
    },
  });

  const catalog = [
    {
      id: "00000000-0000-4000-8000-000000000020",
      categoryId: burgers.id,
      name: "Smash Burger",
      priceCents: 2990,
      imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop",
    },
    {
      id: "00000000-0000-4000-8000-000000000021",
      categoryId: burgers.id,
      name: "Duplo Bacon",
      priceCents: 3490,
      imageUrl: "https://images.unsplash.com/photo-1553979459-222fbba03181?w=400&h=400&fit=crop",
    },
    {
      id: "00000000-0000-4000-8000-000000000022",
      categoryId: bebidas.id,
      name: "Coca-Cola 350ml",
      priceCents: 890,
      imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop",
    },
    {
      id: "00000000-0000-4000-8000-000000000023",
      categoryId: bebidas.id,
      name: "Suco Natural",
      priceCents: 1290,
      imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop",
    },
  ];

  for (const p of catalog) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        priceCents: p.priceCents,
        description: `Delicioso ${p.name}`,
        imageUrl: p.imageUrl,
      },
      create: {
        id: p.id,
        tenantId: tenant.id,
        branchId: branch.id,
        categoryId: p.categoryId,
        name: p.name,
        priceCents: p.priceCents,
        description: `Delicioso ${p.name}`,
        imageUrl: p.imageUrl,
      },
    });
  }

  console.log("Seed OK — tenant:", tenant.slug);
  console.log("Branch ID:", branch.id);
  console.log("Usuários: admin@inovagastro360.local (admin_cliente), superadmin@inovagastro360.local (super_admin)");
  if (!process.env.SEED_ADMIN_PASSWORD && !process.env.CI) {
    console.log("(senha exibida acima — defina SEED_ADMIN_PASSWORD para fixá-la)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
