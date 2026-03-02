/**
 * Contains methods for accessing the metadata for field set member fields.
 */
public class FieldSetMember {

  /**
   * Returns true if the field is required by the field’s definition in its sObject, otherwise, false .
   * @return Boolean
   */
  public Boolean getDBRequired() {}

  /**
   * Returns a field path string in a format ready to be used in a dynamic SOQL query.
   * @return String
   */
  public String getFieldPath() {}

  /**
   * Returns the text label that’s displayed next to the field in the Salesforce user interface.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns true if the field is required by the field set, otherwise, false .
   * @return Boolean
   */
  public Boolean getRequired() {}

  /**
   * Returns the field’s Apex data type.
   * @return Schema.DisplayType
   */
  public Schema.DisplayType getType() {}

  /**
   * Returns the token for this field.
   * @return Schema.sObjectField
   */
  public Schema.sObjectField getSObjectField() {}

}