/**
 * Represents the activation contact point input.
 */
global class ActivationContactPointInput {

  /**
   * Attributes for the contact point.
   */
  global List < ConnectApi.ContactPointAttributeInput > attributesConfig;

  /**
   * Entity name for the contact point.
   */
  global String entityName;

  /**
   * External platform hash method for the contact point.
   */
  global String externalPlatformHashMethod;

  /**
   * Filter expression for the contact point.
   */
  global List < ConnectApi.DMOFilterInput > filterExpression;

  /**
   * Query path configuration list.
   */
  global List < ConnectApi.QueryPathInputConfig > queryPathConfig;

  /**
   * Source configurations for the contact point.
   */
  global List < ConnectApi.ContactPointSourceInput > sourcesConfig;

  /**
   * Type of contact point. Email Maid Ott Phone Push Subscriber_Key_Email Subscriber_Key_Phone WhatsApp
   */
  global ContactPointTypeRepresentationEnum type;

}