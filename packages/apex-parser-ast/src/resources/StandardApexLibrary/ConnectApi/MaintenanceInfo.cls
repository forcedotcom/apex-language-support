/**
 * Information about the upcoming scheduled maintenance for the organization.
 */
global class MaintenanceInfo {

  /**
   * Description of the maintenance.
   */
  global String description;

  /**
   * Title of the maintenance.
   */
  global String maintenanceTitle;

  /**
   * Type of maintenance. Values are: Downtime —Downtime maintenance. GenerallyAvailable —Generally available mode. MaintenanceAndAvailable —Maintenance with available mode. MaintenanceWithDowntime —Scheduled maintenance with downtime. ReadOnly —Maintenance with read-only mode.
   */
  global ConnectApi.MaintenanceType maintenanceType;

  /**
   * Effective time when users start seeing the maintenance message.
   */
  global Datetime messageEffectiveTime;

  /**
   * Expiration time of the maintenance message.
   */
  global Datetime messageExpirationTime;

  /**
   * Scheduled end of downtime. null for GenerallyAvailable and ReadOnly maintenance types.
   */
  global Datetime scheduledEndDowntime;

  /**
   * Scheduled end of maintenance. null for Downtime maintenance type.
   */
  global Datetime scheduledEndMaintenanceTime;

  /**
   * Scheduled start of downtime. null for GenerallyAvailable and ReadOnly maintenance types.
   */
  global Datetime scheduledStartDowntime;

  /**
   * Scheduled start time of maintenance. null for Downtime maintenance type.
   */
  global Datetime scheduledStartMaintenanceTime;

}