/**
 * Represents the configuration input for contact point sources.
 */
global class ContactPointSourceInput {

  /**
   * Record ID of the data source.
   */
  global String dataSourceId;

  /**
   * Type of contact point. ContactPointPrefAny ContactPointPrefBusiness ContactPointPrefPersonal ContactPointPrefPrimary
   */
  global ContactPointPrefEnum dataSourcePreference;

  /**
   * Priority of the data source.
   */
  global Integer dataSourcePriority;

  /**
   * ID of the data source.
   */
  global String id;

  /**
   * Name of the data source.
   */
  global String name;

}