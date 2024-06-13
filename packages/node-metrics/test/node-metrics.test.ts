import { expect, jest} from '@jest/globals'

import { MetricPublisher } from '../src/publishMetrics.js';
import { NodeMetrics } from '../src/node-metrics.js'; // Ensure this comes after MetricPublisher import

const ceramicStub: any = {};

const pubMock = jest.fn().mockResolvedValue({ id: 'mock-model-metric-stream-id' });
jest.spyOn(MetricPublisher.prototype, 'publishMetric').mockImplementation(pubMock);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('metrics publish at intervals', () => {

  beforeAll(async () => {

    jest.useFakeTimers()

    NodeMetrics.start({
      ceramic: ceramicStub, 
      network: 'dev-unstable',
      nodeId: '123',
      intervalMS: 1000
    })
  })

  afterAll(async () => {
    await NodeMetrics.stopPublishing()
    jest.useRealTimers() 
    pubMock.mockClear()
  })


  test('create metric', async () => {
    expect(pubMock).toHaveBeenCalledTimes(0)
    NodeMetrics.count('recentErrors', 1)
    jest.advanceTimersByTime(1000); 
    expect(pubMock).toHaveBeenCalledTimes(1)
  })

});


describe('reset works between calls to publish', () => {

  beforeAll(async () => {

    NodeMetrics.start({
      ceramic: ceramicStub,
      network: 'dev-unstable',
      nodeId: '123',
      intervalMS: 10  // we are using real timers so go fast
    })
  })

  afterEach(async () => {
    pubMock.mockClear()
  })

  afterAll(async () => {
    NodeMetrics.stopPublishing()
  })


  test('publish and reset happens', async () => {

    NodeMetrics.count('recentErrors', 1)
    await delay(10);
    const metricData = pubMock.mock.calls[0][0];
    expect(metricData.recentErrors).toBe(1)

    await delay(10);
    const metricData1 = pubMock.mock.calls[1][0];
    expect(metricData1.recentErrors).toBe(0)
  })


  test('record multiple metrics', async () => {

    NodeMetrics.recordError('test error 1')
    NodeMetrics.recordError('test error 2')
    NodeMetrics.recordError('a'.repeat(1000))

    NodeMetrics.recordAnchorRequestAgeMS(1000)
    NodeMetrics.recordAnchorRequestAgeMS(3000)
    NodeMetrics.recordAnchorRequestAgeMS(2000)

    NodeMetrics.observe('totalPinnedStreams', 100)
    NodeMetrics.observe('totalPinnedStreams', 102) // second observation is stored

    NodeMetrics.count('recentCompletedRequests', 20)
    NodeMetrics.count('recentCompletedRequests', 30)

    await delay(10);

    const metricData = pubMock.mock.calls[0][0];
    expect(metricData.recentErrors).toBe(3)
    
    expect(metricData.sampleRecentErrors[2]).toBe('a'.repeat(512)) //errors are trimmed
    expect(metricData.totalPinnedStreams).toBe(102) // last observation
    expect(metricData.recentCompletedRequests).toBe(50) // counts add up
    expect(metricData.meanAnchorRequestAgeMS).toBe(2000) // mean age 
    expect(metricData.maxAnchorRequestAgeMS).toBe(3000)
   
    await delay(10);

    const metricData1 = pubMock.mock.calls[1][0];
    expect(metricData1.sampleRecentErrors).toStrictEqual([])
  })

});



describe('test startup params', () => {

  test('all params', async() => {

    NodeMetrics.start({
           ceramic: ceramicStub,
           network: 'dev-unstable',
           intervalMS: 1000,
           ceramicVersion: 'v1.0',
           ipfsVersion: 'v1.0.1',
           nodeId: '123',
           nodeName: 'fred',
           nodeAuthDID: 'did:key:456',
           nodeIPAddr: '10.0.0.1',
           nodePeerId: 'pMqqqqqqqqq',
           logger: null
    })
    NodeMetrics.stopPublishing()
  })

})
