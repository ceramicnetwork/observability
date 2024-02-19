import { expect, jest} from '@jest/globals'

//jest.unstable_mockModule('../src/publishMetrics.js', () => ({
//    publishMetric: jest.fn(),
//}));

const ceramicStub: any = {};
let ModelMetrics;
let pubMock;

describe('simple test of metrics', () => {

  beforeAll(async () => {
    jest.useFakeTimers()

    jest.unstable_mockModule('../src/publishMetrics', () => ({
      publishMetric: jest.fn(),
    }));

    // Import the module after mocking it to get the mocked export
    pubMock = await import('../src/publishMetrics');
    
    const modelMetricsModule = await import('../src/model-metrics');
    ModelMetrics = modelMetricsModule.ModelMetrics;    

    console.log(jest.isMockFunction(pubMock.publishMetric));

    ModelMetrics.start(ceramicStub, 1000)
  })

  afterAll(async () => {
    console.log("Done.")
  })


  test('create metric', async () => {
    ModelMetrics.count('recentErrors', 1)
    jest.advanceTimersByTime(3000); // Advance time by 3 seconds
    expect(pubMock.publishMetric).toHaveBeenCalled();
  })


});



describe('test startup params', () => {

  beforeAll(async () => {
    jest.useFakeTimers()
    const modelMetricsModule = await import('../src/model-metrics.js');
    ModelMetrics = modelMetricsModule.ModelMetrics;
    ModelMetrics.start(ceramicStub, 1000)
  })

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
