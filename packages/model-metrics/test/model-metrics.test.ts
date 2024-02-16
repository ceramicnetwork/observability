import { publishMetric } from '../src/model-metrics.js'
import { expect, jest} from '@jest/globals'

describe('publishMetric with ceramic mock', () => {

  const mockCeramic = {
    create: jest.fn(async (...args) => { // Use rest parameter syntax to capture all arguments
      console.log('ModelInstanceDocument.create called with', args);
      return { success: true };
    }),
  };

  beforeEach(() => {
    // Reset mocks, setup initial state, etc.
    mockCeramic.create.mockClear();
  });

  afterEach(() => {
    // Cleanup actions after each test
  });

  it('should log calls made to ceramic', async () => {
    // Assuming publishMetric uses mockCeramic.create internally
    const testData = {
      ts: new Date(),
      name: 'Hello Metrics World',
      recentErrors: 2,
    };

    // Directly pass the mockCeramic to your function
    await publishMetric(mockCeramic, testData);

    // Verify mockCeramic.create was called
    expect(mockCeramic.create).toHaveBeenCalled();
  });
});
