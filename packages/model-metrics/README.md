# Model Metrics

Publishes metrics and Ceramic Node settings to the Metrics Model on Ceramic Network

 ## Purpose

Uses the decentralized CeramicNetwork to publish metrics and data about Ceramic Nodes

## Installation

```sh
npm install model-metrics
```

## Usage

Import the class, start the metrics publishing service and record metrics.

```ts
import { ModelMetrics } from '@ceramicnetwork/model-metrics'

ModelMetrics.start(ceramic, 30000)

ModelMetrics.observe('totalPinnedStreams', 100)
ModelMetrics.count('recentCompletedRequests', 20)

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


