/**
 * Represents metadata for a data graph.
 */
global class CdpQueryDataGraphMetadata {

  /**
   * Name of the data space in which the data graph metadata resides.
   */
  global String dataspaceName;

  /**
   * Description of the data graph metadata.
   */
  global String description;

  /**
   * Developer name of the data graph metadata.
   */
  global String developerName;

  /**
   * Metadata for the data object of the data graph.
   */
  global ConnectApi.DataGraphObjectData dgObject;

  /**
   * Extended properties of the data graph metadata.
   */
  global Object extendedProperties;

  /**
   * API name of the Data Model Object (DMO) that contains the ID table for the data graph.
   */
  global String idDmoName;

  /**
   * Data about the DMO that contains the ID table for the data graph.
   */
  global ConnectApi.DataGraphIdsDmo idsDmo;

  /**
   * Name of the primary object for the data graph.
   */
  global String primaryObjectName;

  /**
   * Data type of the primary object for the data graph. Adg AdgActivationAudience AdgExternal Bridge Calculated CalculatedRealTime CalculatedStreaming Curated Custom Derived MlPrediction ObjectTypeUnspecified Package SegmentMembership Standard System Transform
   */
  global DataGraphObjectTypeEnum primaryObjectType;

  /**
   * Status of the data graph. Error Inprogress Published Ready StatusUnspecified Unrecognized
   */
  global DataGraphStatusEnum status;

  /**
   * Data about the Data Model Object (DMO) that contains the JSON records for the data graph.
   */
  global ConnectApi.DataGraphValuesDmo valuesDmo;

  /**
   * API name of the DMO that contains the JSON records for the data graph.
   */
  global String valuesDmoName;

  /**
   * Version of the data graph metadata.
   */
  global String version;

}