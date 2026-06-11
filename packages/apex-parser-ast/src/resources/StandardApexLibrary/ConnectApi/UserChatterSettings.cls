/**
 * User’s global Chatter settings.
 */
global class UserChatterSettings {

  global UserChatterSettings() {}

  /**
   * The default frequency with which a user receives email from a group when they join it.
   */
  global ConnectApi.GroupEmailFrequency Enum defaultGroupEmailFrequency;

  global Object clone() {}

}