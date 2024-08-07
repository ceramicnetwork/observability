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


  test('publish resets the values', () => {
    let tmetric = new TimeableMetric(SinceField.TIMESTAMP, 'testMetric', 1000);
    let observeSpy = jest.spyOn(ServiceMetrics, 'observe').mockImplementation(() => null)

    tmetric.startPublishingStats();

    let task: Timeable = { timestamp: Date.now() };

    jest.advanceTimersByTime(100);
    // event happens after 100 ms
    tmetric.record(task)

    // event happens after 200 ms
    jest.advanceTimersByTime(100);
    tmetric.record(task)

    jest.advanceTimersByTime(2000); // Advance time by 2 seconds

   
    // Average of 100 and 200 is 150 
    expect(observeSpy).toHaveBeenNthCalledWith(1, 'testMetric_mean', 150);

    // Maximum time elapsed was 200 ms
    expect(observeSpy).toHaveBeenNthCalledWith(2, 'testMetric_max', 200);

    // After publishing, the mean is reset to NaN
    expect(Number.isNaN(observeSpy.mock.calls[2][1])).toBe(true);

    // After publishing, max is reset to 0
    expect(observeSpy).toHaveBeenNthCalledWith(4, 'testMetric_max', 0);

    tmetric.stopPublishingStats()
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
           1000, // exportIntervalMillis
           800   // exportTimeoutMillis
     )
   })

   test('we now accept strings and force numeric', async() => {

    ServiceMetrics.start(
           'localhost:3000', 
           'test',
           1,
           null,
           false,
           0,
           "1000", // exportIntervalMillis
           "800"   // exportTimeoutMillis
     )
   })

   test('should throw error if exportIntervalMillis is less than exportTimeoutMillis', async () => {
        expect(() => {
            ServiceMetrics.start(
                'localhost:3000',
                'test',
                1,
                null,
                false,
                0,
                500,  // exportIntervalMillis
                1000  // exportTimeoutMillis
            );
        }).toThrowError(new Error('Invalid export and timeout intervals 500 and 1000. Export interval must be greater than timeout interval and nonzero.'));
    })

    test('should throw error if exportIntervalMillis is zero', async () => {
        expect(() => {
            ServiceMetrics.start(
                'localhost:3000',
                'test',
                1,
                null,
                false,
                0,
                0, // exportIntervalMillis
                0  // exportTimeoutMillis
            );
        }).toThrowError(new Error('Invalid export and timeout intervals 0 and 0. Export interval must be greater than timeout interval and nonzero.'));
    })

})


describe('test of metrics with instance identifier', () => {
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
    ServiceMetrics.start('localhost:3000', 'test')
    ServiceMetrics.setInstanceIdentifier("fred")
  })

  afterAll(async () => {
    await server.close();
    console.log('Server has been shut down');
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


  test('instance id is inserted into parameters', async () => {

    // get the counter to initialize
    ServiceMetrics.count('testy', 1)   
 
    let spy = jest.spyOn(ServiceMetrics.counters['testy'], 'add').mockImplementation(() => null)
    
    ServiceMetrics.count('testy', 1)
    expect(spy).toHaveBeenCalledWith(1, {'instanceId': 'fred'})

    ServiceMetrics.count('testy', 2, {'thing':'thong'})
    expect(spy).toHaveBeenCalledWith(2, {'thing':'thong', 'instanceId': 'fred'})

    spy.mockRestore()
  })
})
