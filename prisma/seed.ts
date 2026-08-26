import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "super@estem.ma").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "superadmin123";
  const name = process.env.SEED_ADMIN_NAME || "Admin des restaurants";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      isSuperAdmin: true,
      mustChangePassword: false,
    },
    create: {
      email,
      name,
      passwordHash,
      isSuperAdmin: true,
      mustChangePassword: false,
    },
  });

  console.log(`Admin prêt : ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
