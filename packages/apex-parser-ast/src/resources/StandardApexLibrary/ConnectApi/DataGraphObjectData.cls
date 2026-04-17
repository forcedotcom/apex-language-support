/**
 * Represents object metadata for a data graph.
 */
global class DataGraphObjectData {

  /**
   * Developer name of the source data graph for the data object.
   */
  global String dataGraphSourceDevName;

  /**
   * Developer name of the data object for the data graph.
   */
  global String developerName;

  /**
   * List of fields for the data object of the data graph.
   */
  global List < ConnectApi.DataGraphField > fields;

  /**
   * Filter criteria for the data object of the data graph.
   */
  global String filterCriteria;

  /**
   * Name of the member Data Model Object (DMO) for the data graph.
   */
  global String memberDmoName;

  /**
   * List of data path relationships for the object data of the data graph.
   */
  global List < ConnectApi.DataGraphRelationship > paths;

  /**
   * List of recency criteria for the object data of the data graph.
   */
  global List < ConnectApi.RecencyCriteria > recencyCriteria;

  /**
   * Recursive list of related data objects for the data graph.
   */
  global List < ConnectApi.DataGraphObjectData > relatedObjects;

  /**
   * Data type of the data object for the data graph. Adg AdgActivationAudience AdgExternal Bridge Calculated CalculatedRealTime CalculatedStreaming Curated Custom Derived MlPrediction ObjectTypeUnspecified Package SegmentMembership Standard System Transform
   */
  global DataGraphObjectTypeEnum type;

}