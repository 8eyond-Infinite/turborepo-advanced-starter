import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PERMISSIONS } from '@repo/contracts';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seeding...');

  // 1. Seed Permissions for all system modules using PERMISSIONS constant namespace
  const permissions = [
    // User permissions
    {
      name: PERMISSIONS.USER.CREATE,
      displayName: 'Thêm mới tài khoản',
      description: 'Cho phép đăng ký và tạo tài khoản người dùng mới trên hệ thống.',
      module: 'Quản lý Người Dùng',
    },
    {
      name: PERMISSIONS.USER.READ,
      displayName: 'Xem hồ sơ & Danh sách User',
      description: 'Cho phép xem danh sách và thông tin hồ sơ chi tiết của thành viên.',
      module: 'Quản lý Người Dùng',
    },
    {
      name: PERMISSIONS.USER.UPDATE,
      displayName: 'Cập nhật & Đổi trạng thái User',
      description: 'Cho phép thay đổi thông tin người dùng, trạng thái hoạt động.',
      module: 'Quản lý Người Dùng',
    },
    {
      name: PERMISSIONS.USER.DELETE,
      displayName: 'Khóa / Xóa tài khoản User',
      description: 'Cho phép tạm khóa hoạt động hoặc xóa tài khoản người dùng ra khỏi hệ thống.',
      module: 'Quản lý Người Dùng',
    },

    // Role permissions
    {
      name: PERMISSIONS.ROLE.CREATE,
      displayName: 'Tạo vai trò mới',
      description: 'Cho phép định nghĩa nhóm vai trò mới.',
      module: 'Quản lý Phân Quyền',
    },
    {
      name: PERMISSIONS.ROLE.READ,
      displayName: 'Xem danh sách Vai trò & Quyền',
      description: 'Cho phép xem danh sách vai trò và ma trận quyền.',
      module: 'Quản lý Phân Quyền',
    },
    {
      name: PERMISSIONS.ROLE.UPDATE,
      displayName: 'Gán & Cập nhật quyền Vai trò',
      description: 'Cho phép chỉnh sửa ma trận quyền gán cho từng vai trò.',
      module: 'Quản lý Phân Quyền',
    },
    {
      name: PERMISSIONS.ROLE.DELETE,
      displayName: 'Xóa vai trò',
      description: 'Cho phép xóa vai trò ra khỏi hệ thống.',
      module: 'Quản lý Phân Quyền',
    },

    // Session permissions
    {
      name: PERMISSIONS.SESSION.READ,
      displayName: 'Xem danh sách Phiên làm việc',
      description: 'Cho phép kiểm tra danh sách phiên đăng nhập của người dùng.',
      module: 'Quản lý Phiên Đăng Nhập',
    },
    {
      name: PERMISSIONS.SESSION.DELETE,
      displayName: 'Thu hồi phiên làm việc',
      description: 'Cho phép kích người dùng ra khỏi phiên làm việc hiện tại.',
      module: 'Quản lý Phiên Đăng Nhập',
    },

    // Audit log permissions
    {
      name: PERMISSIONS.AUDIT.READ,
      displayName: 'Xem nhật ký hoạt động',
      description: 'Cho phép theo dõi lịch sử và nhật ký thao tác của người dùng.',
      module: 'Nhật Ký Hoạt Động',
    },
  ];

  console.log('Seeding permissions...');
  const seededPermissions = [];
  for (const permission of permissions) {
    const p = await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        description: permission.description,
        displayName: permission.displayName,
        module: permission.module,
      },
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
  
  // Admin gets ALL permissions
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

  // Regular user gets only read permission for users
  const readPerm = seededPermissions.find(p => p.name === PERMISSIONS.USER.READ);
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
    update: {
      username: 'admin',
      password: '$2b$10$Rs1AH6fuW9tkRFJDDPPsGenvCZow3771N7x4/x34O.yNxUfhilmcG',
    },
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: '$2b$10$Rs1AH6fuW9tkRFJDDPPsGenvCZow3771N7x4/x34O.yNxUfhilmcG', // adminpassword
      isActive: true,
      isDeleted: false,
    },
  });

  // Assign ADMIN role to adminUser
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

  // 5. Seed Dynamic Menus with matching PERMISSIONS
  console.log('Seeding menus...');
  await prisma.menu.deleteMany();

  const sysAdminMenu = await prisma.menu.create({
    data: {
      title: 'Quản trị hệ thống',
      url: '#',
      icon: 'Shield',
      order: 0,
    },
  });

  await prisma.menu.createMany({
    data: [
      {
        parentId: sysAdminMenu.id,
        title: 'Tổng quan',
        url: '/',
        order: 0,
      },
      {
        parentId: sysAdminMenu.id,
        title: 'Quản lý Users',
        url: '/users',
        order: 1,
        permission: PERMISSIONS.USER.READ,
      },
      {
        parentId: sysAdminMenu.id,
        title: 'Phân quyền Roles',
        url: '/roles',
        order: 2,
        permission: PERMISSIONS.ROLE.READ,
      },
      {
        parentId: sysAdminMenu.id,
        title: 'Phiên đăng nhập',
        url: '/sessions',
        order: 3,
        permission: PERMISSIONS.SESSION.READ,
      },
      {
        parentId: sysAdminMenu.id,
        title: 'Nhật ký hoạt động',
        url: '/audit-logs',
        order: 4,
        permission: PERMISSIONS.AUDIT.READ,
      },
    ],
  });

  const infraMenu = await prisma.menu.create({
    data: {
      title: 'Cấu hình hạ tầng',
      url: '#',
      icon: 'Settings2',
      order: 1,
    },
  });

  await prisma.menu.createMany({
    data: [
      {
        parentId: infraMenu.id,
        title: 'Redis Cache',
        url: '#',
        order: 0,
      },
      {
        parentId: infraMenu.id,
        title: 'Database PostgreSQL',
        url: '#',
        order: 1,
      },
      {
        parentId: infraMenu.id,
        title: 'System Logs',
        url: '#',
        order: 2,
      },
    ],
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
