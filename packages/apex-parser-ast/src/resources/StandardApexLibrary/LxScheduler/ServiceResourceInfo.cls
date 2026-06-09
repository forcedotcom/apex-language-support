/**
 * Contains information about a service resource.
 */
global class ServiceResourceInfo {

  global ServiceResourceInfo(String userId, String userName, String email, String serviceResourceId, List<String> territoryIds, String resourceType) {}

  /**
   * Returns the email ID of the service resource.
   * @return String
   */
  global String getEmail() {}

  /**
   * Returns the type of the service resource such as Technician or Asset.
   * @return String
   */
  global String getResourceType() {}

  /**
   * Returns the ID of the service resource.
   * @return String
   */
  global String getServiceResourceId() {}

  /**
   * Returns a list of requested service territories for the service resource.
   * @return List<String>
   */
  global List<String> getTerritoryIds() {}

  /**
   * Returns the user ID of the service resource.
   * @return String
   */
  global String getUserId() {}

  /**
   * Returns the user name of the service resource.
   * @return String
   */
  global String getUserName() {}

  global Object clone() {}

}