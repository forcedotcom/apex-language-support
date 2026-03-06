/**
 * Org settings.
 */
global class OrganizationSettings {

  /**
   * Amount of time after which the system prompts users who have been inactive to log out or continue working.
   */
  global Integer accessTimeout;

  /**
   * Information about features available in the org.
   */
  global ConnectApi.Features features;

  /**
   * Information about a list of upcoming scheduled maintenances for the org.
   */
  global List < ConnectApi.MaintenanceInfo > maintenanceInfo;

  /**
   * Org name.
   */
  global String name;

  /**
   * 18-character ID for the org.
   */
  global String orgId;

  /**
   * Information about the org permissions for the user.
   */
  global ConnectApi.UserSettings userSettings;

}