/**
 * Get orchestration instances.
 */
global class Orchestration {

  global Orchestration() {}

  global static ConnectApi.OrchestrationInstance getOrchestrationInstance(String instanceId) {}

  global static ConnectApi.OrchestrationInstanceCollection getOrchestrationInstanceCollection(String relatedRecordId) {}

  global static ConnectApi.OrchestrationInstanceCollection getOrchestrationInstanceCollection(String relatedRecordId, String relatedOrchestrationId) {}

  global Object clone() {}

}