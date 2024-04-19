# Service Metrics

Exports metrics and traces to OTLP-compatible collector

 ## Purpose

Provides an interface for recording metrics and traces.

## Installation

```sh
npm install @ceramicnetwork/observability
```

## Usage

Import the class, start the metrics service and record metrics.

NOTE that an OTLP collector host must be provided or the functions will not be operative.

```ts
import { Metrics } from '@ceramicnetwork/observability'

```


## Configuration

Configuration settings should be passed to the `start` function which instantiates the metrics singleton instance.

```ts

