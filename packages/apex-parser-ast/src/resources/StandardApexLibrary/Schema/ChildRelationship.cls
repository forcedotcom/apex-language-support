/**
 * Contains methods for accessing the child relationship as well as the child sObject for a parent sObject.
 */
global class ChildRelationship {

  global ChildRelationship() {}

  /**
   * Returns the token of the child sObject on which there is a foreign key back to the parent sObject.
   * @return Schema.SObjectType
   */
  global Schema.SObjectType getChildSObject() {}

  /**
   * Returns the token of the field that has a foreign key back to the parent sObject.
   * @return Schema.SObjectField
   */
  global Schema.SObjectField getField() {}

  /**
   * Returns the name of the relationship.
   * @return String
   */
  global String getRelationshipName() {}

  /**
   * Returns true if the child object is deleted when the parent object is deleted, false otherwise.
   * @return Boolean
   */
  global Boolean isCascadeDelete() {}

  /**
   * Reserved for future use.
   * @return Boolean
   */
  global Boolean isDeprecatedAndHidden() {}

  /**
   * Returns true if the parent object can't be deleted because it is referenced by a child object, false otherwise.
   * @return Boolean
   */
  global Boolean isRestrictedDelete() {}

  global List<String> getJunctionIdListNames() {}

  global List<Schema.SObjectType> getJunctionReferenceTo() {}

  global Object clone() {}

}