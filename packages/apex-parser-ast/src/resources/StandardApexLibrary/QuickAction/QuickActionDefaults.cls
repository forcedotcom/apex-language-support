/**
 * Represents an abstract Apex class that provides the context for running the standard Email Action on Case Feed and the container of the Email Message fields for the action payload. You can override the target fields before the standard Email Action is rendered.
 */
global class QuickActionDefaults {

  global QuickActionDefaults() {}

  /**
   * Returns the name of the standard Email Action on Case Feed (Case.Email).
   * @return String
   */
  global String getActionName() {}

  /**
   * Returns the type of the standard Email Action on Case Feed (Email).
   * @return String
   */
  global String getActionType() {}

  /**
   * The ID of the context related to the standard Email Action on Case Feed (Case ID).
   * @return Id
   */
  global Id getContextId() {}

  /**
   * The target object of the standard Email Action on Case Feed (EmailMessage).
   * @return SObject
   */
  global SObject getTargetSObject() {}

  global Object clone() {}

}