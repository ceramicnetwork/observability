/**
 * Interfaces and model schemas for simple metrics
 */

export const metricSchema = `

interface MetricEvent
  @createModel(description: "Required metric event content interface") {
  ts: DateTime!
  ceramicNode: CeramicNode
}

type CeramicNode {
  id: String! @string(minLength: 1, maxLength: 1024)
  name: String! @string(minLength: 1, maxLength: 128)
  nodeAuthDID: String! @string(minLength: 1, maxLength: 1024)
  IPAddress: String! @string(minLength: 1, maxLength: 64)
  PeerID: String! @string(minLength: 1, maxLength: 256)
}

type GenericMetricEvent implements MetricEvent
  @createModel(description: "Metric Event with data as json blob") {
  ts: DateTime!
  name: String! @string(minLength: 1, maxLength: 1024)
  indexBy: String! @string(minLength: 1, maxLength: 1024)
  dataBlob: String! @string(minLength: 1, maxLength: 4096)
  ceramicNode: CeramicNode
}

type PeriodicMetricEventV1 implements MetricEvent
  @createModel(description: "Initial take on useful metric fields") {
  ts: DateTime!
  name: String! @string(minLength: 1, maxLength: 128)
  ceramicNode: CeramicNode
  lookbackWindowMS: Int

  ceramicVersion: String @string(minLength:1, maxLength: 32)
  ipfsVersion: String @string(minLength:1, maxLength: 32)
  totalPinnedStreams: Int
  totalIndexedModels: Int
  currentPendingRequests: Int
  recentCompletedRequests: Int
  recentErrors: String! @string(minLength: 1, maxLength: 4096)
}
`
