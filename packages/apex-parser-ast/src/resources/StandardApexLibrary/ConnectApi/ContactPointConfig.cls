/**
 * Represents an activation contact point configuration output.
 */
global class ContactPointConfig {

  /**
   * Contact point field configurations.
   */
  global ConnectApi.ActivationContactPointsFieldConfig activationContactPointFieldConfig;

  /**
   * Contact point source configurations.
   */
  global ConnectApi.ActivationContactPointsSourceConfig activationContactPointSourcesConfig;

  /**
   * Contact point filter expression.
   */
  global ConnectApi.ContactPointFilterExpression contactPointFilterExpression;

  /**
   * Contact point path.
   */
  global String contactPointPath;

  /**
   * Type of contact point. Email Maid Ott Phone Push Subscriber_Key_Email Subscriber_Key_Phone WhatsApp
   */
  global ContactPointTypeRepresentationEnum contactPointType;

  /**
   * ID of the entity.
   */
  global String entityId;

  /**
   * Name of the entity.
   */
  global String entityName;

  /**
   * List of query path configurations.
   */
  global List < ConnectApi.QueryPathConfigList > queryPathConfigList;

}