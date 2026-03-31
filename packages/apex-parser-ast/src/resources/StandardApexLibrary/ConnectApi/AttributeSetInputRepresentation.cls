/**
 * Attribute set information input.
 */
global class AttributeSetInputRepresentation {

  /**
   * List of up to 5 attribute API names. Required if creating a new attribute set.
   */
  global List < String > attributes;

  /**
   * If updating an attribute set, the ID of the existing attribute set for the variation parent product.
   */
  global String id;

  /**
   * Attribute set name for a new attribute set.
   */
  global String name;

}