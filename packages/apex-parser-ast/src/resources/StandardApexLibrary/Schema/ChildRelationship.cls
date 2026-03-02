/**
 * Contains methods for accessing the child relationship as well as the child sObject for a parent sObject.
 */
public class ChildRelationship {

  /**
   * Returns the token of the child sObject on which there is a foreign key back to the parent sObject.
   * @return Schema.SObjectType
   */
  public Schema.SObjectType getChildSObject() {}

  /**
   * Returns the token of the field that has a foreign key back to the parent sObject.
   * @return Schema.SObjectField
   */
  public Schema.SObjectField getField() {}

  /**
   * Returns the name of the relationship.
   * @return String
   */
  public String getRelationshipName() {}

  /**
   * Returns true if the child object is deleted when the parent object is deleted, false otherwise.
   * @return Boolean
   */
  public Boolean isCascadeDelete() {}

  /**
   * Reserved for future use.
   * @return Boolean
   */
  public Boolean isDeprecatedAndHidden() {}

  /**
   * Returns true if the parent object can't be deleted because it is referenced by a child object, false otherwise.
   * @return Boolean
   */
  public Boolean isRestrictedDelete() {}

}