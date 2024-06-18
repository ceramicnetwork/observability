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
  name: String @string(maxLength: 128)
  nodeAuthDID: String @string(maxLength: 256)
  IPAddress: String @string(maxLength: 64)
  PeerID: String @string(maxLength: 256)
  ceramicVersion: String @string(maxLength: 32)
  ipfsVersion: String @string(maxLength: 32)
}

type GenericMetricEvent implements MetricEvent
  @createModel(description: "Metric Event with data as json blob") {
  ts: DateTime!
  ceramicNode: CeramicNode!
  dataBlob: String @string(maxLength: 4096)
}

type PeriodicMetricEventV1 implements MetricEvent
  @createModel(description: "Initial take on useful metric fields") {

  ts: DateTime!
  ceramicNode: CeramicNode!

  lookbackWindowMS: Int

  totalPinnedStreams: Int
  totalIndexedModels: Int
  currentPendingRequests: Int

  meanAnchorRequestAgeMS: Int
  maxAnchorRequestAgeMS: Int
  recentCreatedRequests: Int
  recentCompletedRequests: Int
  recentErrors: Int

  sampleRecentErrors: [String] @string(maxLength: 512) @list(maxLength: 8)
}

`;
