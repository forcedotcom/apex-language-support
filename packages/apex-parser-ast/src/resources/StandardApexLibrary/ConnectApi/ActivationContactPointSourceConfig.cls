/**
 * Represents an activation contact point source configuration output.
 */
global class ActivationContactPointSourceConfig {

  /**
   * ID of the data source.
   */
  global String dataSourceId;

  /**
   * Name of the data source.
   */
  global String dataSourceName;

  /**
   * Type of contact point. ContactPointPrefAny ContactPointPrefBusiness ContactPointPrefPersonal ContactPointPrefPrimary
   */
  global ContactPointPrefEnum dataSourcePreference;

  /**
   * Priority of the data source.
   */
  global Integer dataSourcePriority;

}