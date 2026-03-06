/**
 * Contains information about the service appointment.
 */
global class ServiceAppointmentInput {

  /**
   * Additional details about the service appointment.
   */
  global String additionalInformation;

  /**
   * Mode of the service appointment. Group — Service appointment mode is Group. Regular — Default mode of service appointment.
   */
  global ConnectApi.SvcApptModeEnum appointmentMode;

  /**
   * Type of the appointment.
   */
  global String appointmentType;

  /**
   * Maximum number of customers that’s allowed to attend the service appointment.
   */
  global Integer attendeeLimit;

  /**
   * Name of the city.
   */
  global String city;

  /**
   * Comments about the appointment.
   */
  global String comments;

  /**
   * ID of the contact associated with the parent record.
   */
  global String contactId;

  /**
   * Name of the country.
   */
  global String country;

  /**
   * Description of the appointment.
   */
  global String description;

  /**
   * ID of the engagement channel type to associate with the appointment. You can use engagement channel type only if: Schedule Appointments Using Engagement Channels is enabled in Salesforce Scheduler Settings in your Salesforce org. Shifts are defined in the scheduling policy. For more information on setting up shifts in the scheduling policy, see Define Shift Rules in Scheduling Policy . Note Engagement channel types are not supported with operating hours rules in the scheduling policy.
   */
  global String engagementChannelTypeId;

  /**
   * Values to add to any of the fields, including custom fields.
   */
  global List < ConnectApi.ExtendedFieldInput > extendedFields;

  /**
   * ID of the parent record associated with the account.
   */
  global String parentRecordId;

  /**
   * Postal code of the city.
   */
  global String postalCode;

  /**
   * Time at which the appointment is scheduled to end.
   */
  global Datetime schedEndTime;

  /**
   * Time at which the appointment is scheduled to start.
   */
  global Datetime schedStartTime;

  /**
   * ID of the service territory associated with the service appointment.
   */
  global String serviceTerritoryId;

  /**
   * Name of the state.
   */
  global String state;

  /**
   * Name of the street.
   */
  global String street;

  /**
   * Short phrase describing the appointment.
   */
  global String subject;

  /**
   * ID of the work type associated with the service appointment. If specified, it is added to the service appointment record.
   */
  global String workTypeId;

}