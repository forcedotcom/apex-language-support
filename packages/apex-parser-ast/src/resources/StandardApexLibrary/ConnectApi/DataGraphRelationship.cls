/**
 * Represents the relationship of a field of the object data for the data graph.
 */
global class DataGraphRelationship {

  /**
   * Cardinality of the relationship of a field for object data of the data graph. CardinalityUnspecified ManyToOne OneToMany OneToOne
   */
  global RelationshipCardinality cardinality;

  /**
   * Field name of the object data for the data graph.
   */
  global String fieldName;

  /**
   * Parent field name of the object data for the data graph.
   */
  global String parentFieldName;

}