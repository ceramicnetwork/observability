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



```ts

