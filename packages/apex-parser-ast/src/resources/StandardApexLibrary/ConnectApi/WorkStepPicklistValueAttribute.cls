/**
 * Work step picklist value attributes.
 */
global class WorkStepPicklistValueAttribute extends ConnectApi.AbstractPicklistValueAttributes {

  /**
   * Order in which the work step statuses are displayed in the status category’s picklist.
   */
  global Integer sortOrder;

  /**
   * Status category of the work step.
   */
  global String statusCode;

}