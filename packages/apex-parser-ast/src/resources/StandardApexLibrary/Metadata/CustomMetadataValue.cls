/**
 * Represents custom metadata values for a custom metadata component.
 * <p>Usage
 * Use Metadata.CustomMetadataValue to access values for custom fields of custom metadata records.
 * Supported Apex primitive types are:
 * Boolean
 * Date
 * DateTime
 * Decimal
 * Double
 * Integer
 * Long
 * String
 * <p>Example
 * // Set a custom field value for a custom metadata record
 * Metadata.CustomMetadataValue customField = new Metadata.CustomMetadataValue();
 * customField.field = 'CustomField1__c';
 * customField.value = 'New Value';
 * customMetadata.values.add(customField);
 */
global class CustomMetadataValue extends Metadata.MetadataValue {
    /**
     * The field name for the custom metadata value.
     * <p>String
     */
    global String field { get; set; }
    /**
     * The field value for the custom metadata value.
     * <p>Object
     * Supported Apex primitive types are:
     * Boolean
     * Date
     * DateTime
     * Decimal
     * Double
     * Integer
     * Long
     * String
     * When setting the value for relationship fields, use the qualified API name of the related metadata, not the ID.
     * For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/langCon_apex_primitives.htm" target="_blank">Primitive Data Types</a>.
     */
    global Object value { get; set; }

    global Object CustomMetadataValue() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}