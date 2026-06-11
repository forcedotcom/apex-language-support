/**
 * Information about a Publish action
 */
global class ManagedContentPublishOutput {

  global ManagedContentPublishOutput() {}

  /**
   * ID of the managed content deployment.
   */
  global String deploymentId;

  /**
   * Publish description.
   */
  global String description;

  /**
   * Publish date.
   */
  global Datetime publishDate;

  global Object clone() {}

}