/**
 * Contains methods for discovering and retrieving the details of field sets created on sObjects.
 */
public class FieldSet {

  /**
   * Returns the field set’s description.
   * @return String
   */
  public String getDescription() {}

  /**
   * Returns a list of Schema.FieldSetMember objects for the fields making up the field set.
   * @return List<FieldSetMember>
   */
  public List<FieldSetMember> getFields() {}

  /**
   * Returns the translation of the text label that is displayed next to the field in the Salesforce user interface.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the field set’s name.
   * @return String
   */
  public String getName() {}

  /**
   * Returns the field set’s namespace.
   * @return String
   */
  public String getNamespace() {}

  /**
   * Returns the Schema.sObjectType of the sObject containing the field set definition.
   * @return Schema.SObjectType
   */
  public Schema.SObjectType getSObjectType() {}

}