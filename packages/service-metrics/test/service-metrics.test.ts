import { ServiceMetrics, Timeable, SinceField, TimeableMetric } from '../src/service-metrics.js'
import { expect, jest} from '@jest/globals'
import { createServer } from 'http'


/*
 * Without exporter, all methods are essentially no-ops
 * Just exercise the existence of the methods and parameters
 *
 */

describe('simple test of metrics', () => {
  let server

  beforeAll(async () => {
    jest.useFakeTimers()
    server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        console.log(`Received metrics:\n${body}`);
        res.end();
      });
    }).listen(3000);
    ServiceMetrics.start('localhost:3000', 'test')
  })

  afterAll(async () => {
    await server.close();
    console.log('Server has been shut down');
  })

  test('trace span', async() => {
    // We only check here if we *can call* the methods
    const span = ServiceMetrics.startSpan("doing it")
    // do things
    span.end()
  })

  test('create metric', async () => {
    ServiceMetrics.count('test_metric', 1, {
      anyparam: null,
      otherparam: 'atring',
      intparam: 2,
    })
    ServiceMetrics.record('test_metric', 1, {
      anyparam: null,
      otherparam: 'atring',
      intparam: 2,
    })
    ServiceMetrics.observe('test_metric', 1, {
      anyparam: null,
      otherparam: 'atring',
      intparam: 2,
    })
  })


  test('create metric and add values', async () => {
    ServiceMetrics.count('test_metric', 1, {
      anyparam: null,
      otherparam: 'atring',
      intparam: 2,
    })
    ServiceMetrics.count('test_metric', 3, {
      anyparam: null,
      otherparam: 'atring',
      intparam: 2,
    })
    ServiceMetrics.count('test_metric', 5, { newparam: 8 })
    ServiceMetrics.record('test_metric', 1, {
      anyparam: null,
      otherparam: 'atring',
      intparam: 2,
    })
    ServiceMetrics.record('test_metric', 3, {
      anyparam: null,
      otherparam: 'atring',
      intparam: 2,
    })
    ServiceMetrics.record('test_metric', 5, { newparam: 9 })

    ServiceMetrics.observe('test_metric', 1)
    ServiceMetrics.observe('test_metric', 2)
  })

  test('record ratio', async () => {
    
    let spy = jest.spyOn(ServiceMetrics, 'record').mockImplementation(() => null)
    
    ServiceMetrics.recordRatio('testy', 2, 4)
    expect(ServiceMetrics.record).toHaveBeenLastCalledWith('testy', .5)

    ServiceMetrics.recordRatio('testy', 2, 0)
    // this did not create a new call to record
    expect(ServiceMetrics.record).toHaveBeenLastCalledWith('testy', .5)

    ServiceMetrics.recordRatio('testy', 6, 8)
    // this did create a new call to record
    expect(ServiceMetrics.record).toHaveBeenLastCalledWith('testy', .75)

    spy.mockRestore()
  })


  test('record object fields', async () => {
    
    let spy = jest.spyOn(ServiceMetrics, 'record').mockImplementation(() => null)
    
    ServiceMetrics.recordObjectFields('testy', { 'numbery': 4, 'stringy': 'thing', 'num2': 5})
    expect(ServiceMetrics.record).toHaveBeenCalledWith('testy_numbery', 4)
    expect(ServiceMetrics.record).toHaveBeenCalledWith('testy_num2', 5)
    expect(ServiceMetrics.record).toHaveBeenCalledTimes(2)

    spy.mockRestore()
  })

  test('startPublishingStats starts interval', () => {
    let tmetric = new TimeableMetric(SinceField.TIMESTAMP, 'testMetric', 1000);
    console.log('Spying on ServiceMetrics:', ServiceMetrics);
    let countSpy = jest.spyOn(ServiceMetrics, 'count').mockImplementation(() => null)
    let observeSpy = jest.spyOn(ServiceMetrics, 'observe').mockImplementation(() => null)

    tmetric.startPublishingStats();

    jest.advanceTimersByTime(3000); // Advance time by 3 seconds

    expect(countSpy).toHaveBeenCalledTimes(3);
    expect(observeSpy).toHaveBeenCalledTimes(6); // Observe is called twice per publish

    tmetric.stopPublishingStats()

    countSpy.mockRestore()
    observeSpy.mockRestore()
  });


  test('many records are one publish', () => {
    let tmetric = new TimeableMetric(SinceField.TIMESTAMP, 'testMetric', 1000);
    let countSpy = jest.spyOn(ServiceMetrics, 'count').mockImplementation(() => null)
    let observeSpy = jest.spyOn(ServiceMetrics, 'observe').mockImplementation(() => null)

    tmetric.startPublishingStats();

    let task: Timeable =  { timestamp: 1706902564000 }

    for (let n = 0; n < 10; n++) {
       tmetric.record(task)
    }

    jest.advanceTimersByTime(3000); // Advance time by 3 seconds

    expect(countSpy).toHaveBeenCalledTimes(3);
    expect(observeSpy).toHaveBeenCalledTimes(6); // Observe is called twice per publish

    tmetric.stopPublishingStats()
    countSpy.mockRestore()
    observeSpy.mockRestore()
  });

  test('stopPublishingStats stops interval', () => {
    let tmetric = new TimeableMetric(SinceField.TIMESTAMP, 'testMetric', 1000);
    let countSpy = jest.spyOn(ServiceMetrics, 'count').mockImplementation(() => null)
    let observeSpy = jest.spyOn(ServiceMetrics, 'observe').mockImplementation(() => null)

    tmetric.startPublishingStats();
    tmetric.stopPublishingStats();

    expect(tmetric['publishIntervalId']).toBeNull();

    jest.advanceTimersByTime(2000); // Advance time after stopping

    expect(countSpy).toHaveBeenCalledTimes(0);
    expect(observeSpy).toHaveBeenCalledTimes(0);

    countSpy.mockRestore()
    observeSpy.mockRestore()
  });

});



describe('test startup params', () => {
  let server

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        console.log(`Received metrics:\n${body}`);
        res.end();
      });
    }).listen(3000);
  })

  afterAll(async () => {
    await server.close();
    console.log('Server has been shut down');
  })

  test('all params', async() => {

    ServiceMetrics.start(
           'localhost:3000', 
           'test',
           1,
           null,
           false,
           0,
           1000,
           500
    )
  })
})
