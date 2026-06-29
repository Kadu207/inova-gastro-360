import bcrypt from "bcryptjs";
import { prisma } from "../src/index";

const DEMO_PASSWORD = "InovaGastro360!";

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
  console.log("Login: admin@inovagastro360.local /", DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
