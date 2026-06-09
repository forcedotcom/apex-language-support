/**
 * Contains methods for discovering and retrieving the details of field sets created on sObjects.
 */
global class FieldSet {

  global FieldSet() {}

  /**
   * Returns the field set’s description.
   * @return String
   */
  global String getDescription() {}

  /**
   * Returns a list of Schema.FieldSetMember objects for the fields making up the field set.
   * @return List<FieldSetMember>
   */
  global List<FieldSetMember> getFields() {}

  /**
   * Returns the translation of the text label that is displayed next to the field in the Salesforce user interface.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the field set’s name.
   * @return String
   */
  global String getName() {}

  /**
   * Returns the field set’s namespace.
   * @return String
   */
  global String getNamespace() {}

  /**
   * Returns the Schema.sObjectType of the sObject containing the field set definition.
   * @return Schema.SObjectType
   */
  global Schema.SObjectType getSObjectType() {}

  global Object clone() {}

}