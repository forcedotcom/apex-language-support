/**
 * Supports synchronous execution of Apex integrations for B2B Commerce. The implementation must return the status of the execution.
 */
global class IntegrationStatus {

  global IntegrationStatus() {}

  global sfdc_checkout.IntegrationStatus.Status status;

  global Object clone() {}

}