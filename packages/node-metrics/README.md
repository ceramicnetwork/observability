# Model Metrics

Publishes metrics and Ceramic Node settings to the Metrics Model on Ceramic Network

 ## Purpose

Uses the decentralized CeramicNetwork to publish metrics and data about Ceramic Nodes

## Enable Configuration

In your `daemon.config.json` file (often found in ~/.ceramic directory), add the following setting:

```
"metrics": {
    "metrics-publisher-enabled": true
  }
```
and restart your ceramic daemon.  

Since the code to record metrics will already be incorporated into the daemon, no further action is necessary.

---

## Installation

Note, this class will be included as a dependency in ceramic daemon, so installation is not necessary.

However, if using in your own project, the package can be installed normally.

```sh
npm install @ceramicnetwork/model-metrics
```


## Usage

Import the class, start the metrics publishing service and record metrics.

```ts
import { ModelMetrics, Counter, Observable } from '@ceramicnetwork/model-metrics'

ModelMetrics.start({ceramic: ceramic, network: 'dev-unstable', intervalMS: 30000})

ModelMetrics.observe(Observable.TOTAL_PINNED_STREAMS, 100)
ModelMetrics.count(Counter.RECENT_COMPLETED_REQUESTS, 20)
ModelMetris.recordError('oops')

ModelMetrics.stopPublishing()

```


## Future Updates

If wishing to modify the metrics model, start by updating the model definition in the `./composites` directory, then
```ts
composedb composite:create your-schema.graphql --output=../__generated__/definition.json --did-private-key=your-private-key
cd ../__generated__
composedb composite:deploy definition.json --ceramic-url=http://localhost:7007 --did-private-key=...

composedb composite:compile definition.json definition.js
```
Depending on the changes made, code changes may need to be made as well, in particular start with the list of models defined in `src/publishMetrics.ts`


