import { expect, jest} from '@jest/globals'

const ceramicStub: any = {};
let ModelMetrics;
let pubMock;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const nextTickPromise = () => new Promise(resolve => process.nextTick(resolve));


describe('metrics publish at intervals', () => {

  beforeAll(async () => {
    jest.useFakeTimers()

    jest.unstable_mockModule('../src/publishMetrics', () => ({
      publishMetric: jest.fn().mockReturnValue({ id: 'mock-model-metric-stream-id' })
    }));

    // Import the module after mocking it to get the mocked export
    pubMock = await import('../src/publishMetrics');
    
    const modelMetricsModule = await import('../src/model-metrics');
    ModelMetrics = modelMetricsModule.ModelMetrics;    

    ModelMetrics.start(ceramicStub, 1000)
  })

  afterAll(async () => {
    await ModelMetrics.stopPublishing()
    jest.useRealTimers() 
    pubMock.publishMetric.mockClear()
  })


  test('create metric', async () => {
    ModelMetrics.count('recentErrors', 1)
    jest.advanceTimersByTime(3000); // Advance three seconds, should cause 3 calls
    expect(pubMock.publishMetric).toHaveBeenCalledTimes(3)
  })

});


describe('reset works between calls to publish', () => {

  beforeAll(async () => {
    jest.unstable_mockModule('../src/publishMetrics', () => ({
      publishMetric: jest.fn().mockReturnValue({ id: 'mock-model-metric-stream-id' })
    }));
    pubMock = await import('../src/publishMetrics');
    const modelMetricsModule = await import('../src/model-metrics');
    ModelMetrics = modelMetricsModule.ModelMetrics;    
  })

  afterEach(async () => {
    pubMock.publishMetric.mockClear()
  })

  test('publish and reset manually', async () => {

    ModelMetrics.count('recentErrors', 1)
    await ModelMetrics.publish(); // normally not called directly

    const metricData = pubMock.publishMetric.mock.calls[0][1];
    expect(metricData.recentErrors).toBe(1)

    ModelMetrics.resetMetrics()

    await ModelMetrics.publish(); 
    const metricData1 = pubMock.publishMetric.mock.calls[1][1];
    expect(metricData1.recentErrors).toBe(0)
  })


  test('record multiple metrics', async () => {

    ModelMetrics.recordError('test error 1')
    ModelMetrics.recordError('test error 2')
    ModelMetrics.recordError('a'.repeat(1000))

    ModelMetrics.recordAnchorRequestAgeMS(1000)
    ModelMetrics.recordAnchorRequestAgeMS(3000)
    ModelMetrics.recordAnchorRequestAgeMS(2000)

    ModelMetrics.observe('totalPinnedStreams', 100)
    ModelMetrics.observe('totalPinnedStreams', 102) // second observation is stored

    ModelMetrics.count('recentCompletedRequests', 20)
    ModelMetrics.count('recentCompletedRequests', 30)

    await ModelMetrics.publish(); 

    const metricData = pubMock.publishMetric.mock.calls[0][1];
    expect(metricData.recentErrors).toBe(3)
    
    expect(metricData.sampleRecentErrors[2]).toBe('a'.repeat(512)) //errors are trimmed
    expect(metricData.totalPinnedStreams).toBe(102) // last observation
    expect(metricData.recentCompletedRequests).toBe(50) // counts add up
    expect(metricData.meanAnchorRequestAgeMS).toBe(2000) // mean age 
    expect(metricData.maxAnchorRequestAgeMS).toBe(3000)

    ModelMetrics.resetMetrics()

    await ModelMetrics.publish(); 
    const metricData1 = pubMock.publishMetric.mock.calls[1][1];
    expect(metricData1.sampleRecentErrors).toStrictEqual([])
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
