import { expect, test } from 'vitest';
import type { PayloadRequest } from 'payload';
import { categoryInUse } from '../src/hooks/in-use.ts';

test('a category used only as an additional category cannot be deleted', async () => {
  const req = {
    payload: {
      find: async () => ({
        docs: [{ title: 'Christmas pants', category: 1, additionalCategories: [6] }],
      }),
    },
  } as unknown as PayloadRequest;
  await expect(categoryInUse({ req, id: 6, collection: {} } as never)).rejects.toThrow(
    'Christmas pants',
  );
  await expect(categoryInUse({ req, id: 9, collection: {} } as never)).resolves.toBeUndefined();
});
