/**
 * A permission type.
 */
global class ContentHubPermissionType {

  global ContentHubPermissionType() {}

  /**
   * Internal ID of the permission type in the repository.
   */
  global String id;

  /**
   * Label as returned by the repository.
   */
  global String label;

  global Object clone() {}

}