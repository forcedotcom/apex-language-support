/**
 * Contains methods for accessing the metadata for field set member fields.
 * Usage
 * Use the methods in the Schema.FieldSetMember class to get details about fields contained within a field set, such as the field label, type, a dynamic SOQL-ready field path, and so on. The following example shows how to get a collection of field set member describe result objects for a specific field set on an sObject:
 * List<Schema.FieldSetMember> fields =
 *     Schema.SObjectType.Account.fieldSets.getMap().get('field_set_name').getFields();
 * If you know the name of the field set in advance, you can access its fields more directly using an explicit reference to the field set:
 * List<Schema.FieldSetMember> fields =
 *     Schema.SObjectType.Account.fieldSets.field_set_name.getFields();
 */
global class FieldSetMember {
    global Boolean dbrequired { get; }
    global String fieldpath { get; }
    global String label { get; }
    global Boolean required { get; }
    global Schema.SObjectField sobjectfield { get; }
    global Schema.DisplayType type { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns true if the field is required by the field’s definition in its sObject, otherwise, false.
     */
    global Boolean getDbRequired() { return false; }

    /**
     * Returns a field path string in a format ready to be used in a dynamic SOQL query.
     * Example
     * See Displaying a Field Set on a Visualforce Page for an example of how to use this method.
     */
    global String getFieldPath() { return null; }

    /**
     * Returns the text label that’s displayed next to the field in the Salesforce user interface.
     */
    global String getLabel() { return null; }

    /**
     * Returns true if the field is required by the field set, otherwise, false.
     */
    global Boolean getRequired() { return false; }

    /**
     * Returns the token for this field.
     */
    global Schema.SObjectField getSObjectField() { return null; }

    /**
     * Returns the field’s Apex data type.
     */
    global Schema.DisplayType getType() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}