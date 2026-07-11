import { PrismaClient } from "@prisma/client";

let prismaInstance: PrismaClient | null = null;

export const getPrisma = (): PrismaClient => {
    if (!prismaInstance) {
        prismaInstance = new PrismaClient();
    }
    return prismaInstance;
};

export const prisma = new Proxy({} as PrismaClient, {
    get(target, prop) {
        const instance = getPrisma();
        return Reflect.get(instance, prop);
    },
});