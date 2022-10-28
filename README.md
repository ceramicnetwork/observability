# Observability

Packages to export metrics and traces 

## Installation

This monorepo uses [pnpm](https://pnpm.io/), make sure to install it first if you don't already have it.

1. `pnpm install` to install the dependencies
1. `pnpm run build` to build all the packages

### Additional scripts

- `pnpm run lint` to run the linter in all packages
- `pnpm run test` to run tests in all packages
- `pnpm run docs` to generate API documentation

## Packages

For exporting metrics to an OTLP Collector: @ceramicnetwork/service-metrics

