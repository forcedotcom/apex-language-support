/**
 * Information about managed content's clone status.
 */
global class ManagedContentCloneStatus {

  /**
   * Localized label for the status.
   */
  global String label;

  /**
   * Status of the managed content clone. Values are: PartialSuccess Success
   */
  global ConnectApi.ManagedContentCloneStatus status;

}