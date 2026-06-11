/**
 * Managed content unpublish action.
 */
global class ManagedContentUnpublishOutput {

  global ManagedContentUnpublishOutput() {}

  /**
   * ID of the Managed content deployment.
   */
  global String deploymentId;

  /**
   * Unpublish description.
   */
  global String description;

  /**
   * Unpublish date.
   */
  global Datetime unpublishDate;

  global Object clone() {}

}