import type { ModuleRef } from '@nestjs/core';
import { BullmqQueueAdapter } from './bullmq-queue.adapter';

describe('BullmqQueueAdapter', () => {
  it('removes sensitive job payloads after completion or final failure', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const moduleRef = {
      get: jest.fn().mockReturnValue({ add }),
    } as unknown as ModuleRef;
    const adapter = new BullmqQueueAdapter(moduleRef);

    await adapter.addJob(
      'user-queue',
      'send-password-reset-email',
      { token: 'secret' },
      { sensitive: true },
    );

    expect(add).toHaveBeenCalledWith(
      'send-password-reset-email',
      { token: 'secret' },
      expect.objectContaining({ removeOnComplete: true, removeOnFail: true }),
    );
  });
});
