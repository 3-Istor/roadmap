import { prisma } from './prisma';

export async function waitForDatabase(maxRetries = 10, delayMs = 2000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✓ Database connection established');
      return true;
    } catch (error) {
      console.log(`⏳ Waiting for database... (attempt ${i + 1}/${maxRetries})`);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  console.error('✗ Failed to connect to database after maximum retries');
  return false;
}
