import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seeding...');

  // 1. Seed Permissions
  const permissions = [
    { name: 'user:create', description: 'Create new users' },
    { name: 'user:read', description: 'Read user information' },
    { name: 'user:update', description: 'Update user information' },
    { name: 'user:delete', description: 'Soft delete users' },
  ];

  console.log('Seeding permissions...');
  const seededPermissions = [];
  for (const permission of permissions) {
    const p = await prisma.permission.upsert({
      where: { name: permission.name },
      update: { description: permission.description },
      create: permission,
    });
    seededPermissions.push(p);
  }

  // 2. Seed Roles
  console.log('Seeding roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { description: 'Administrator with full access' },
    create: {
      name: 'ADMIN',
      description: 'Administrator with full access',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: { description: 'Regular user' },
    create: {
      name: 'USER',
      description: 'Regular user',
    },
  });

  // 3. Bind Permissions to Roles (RolePermission)
  console.log('Binding permissions to roles...');
  
  // Admin gets all permissions
  for (const perm of seededPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Regular user gets only read permission
  const readPerm = seededPermissions.find(p => p.name === 'user:read');
  if (readPerm) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: userRole.id,
          permissionId: readPerm.id,
        },
      },
      update: {},
      create: {
        roleId: userRole.id,
        permissionId: readPerm.id,
      },
    });
  }

  // 4. Seed Default Admin User
  console.log('Seeding default Admin user...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: '$2b$10$tZ216f9f3f.F8n4Jp1hMSuWqK9yLhEw0vG63hI1tB.g1rG5Rk3aL2', // adminpassword
      isActive: true,
      isDeleted: false,
    },
  });

  // Assign ADMIN role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
