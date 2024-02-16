import { expect, jest} from '@jest/globals'

jest.mock('../src/publishMetrics.js', () => ({
  publishMetric: jest.fn(),
}));
console.log(jest.isMockFunction(publishMetric));
import { ModelMetrics } from '../src/model-metrics.js'
import { publishMetric } from '../src/publishMetrics.js'
import * as publishMetricsModule from '../src/publishMetrics.js';
console.log(jest.isMockFunction(publishMetric));
console.log(jest.isMockFunction(publishMetricsModule.publishMetric));

const ceramicStub: any = {};

describe('simple test of metrics', () => {

  beforeAll(async () => {
    jest.useFakeTimers()
    
    ModelMetrics.start(ceramicStub, 1000)
  })

  afterAll(async () => {
    console.log("Done.")
  })


  test('create metric', async () => {
    ModelMetrics.count('recentErrors', 1)
    jest.advanceTimersByTime(3000); // Advance time by 3 seconds
    expect(publishMetricsModule.publishMetric).toHaveBeenCalled();
  })


});



describe('test startup params', () => {

  test('all params', async() => {

    ModelMetrics.start(
           ceramicStub,
           1000,
           'v1.0',
           'v1.0.1',
           '123',
           'fred',
           'did:key:456',
           '10.0.0.1',
           'pMqqqqqqqqq',
           null
    )
  })
})
