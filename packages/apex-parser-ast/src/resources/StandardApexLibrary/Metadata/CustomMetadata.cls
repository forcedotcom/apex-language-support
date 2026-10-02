/**
 * Represents records of custom metadata types.
 * <p>Usage
 * Use Metadata.CustomMetadata to represent records of custom metadata types in Apex. For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_custommetadatatypes.htm" target="_blank">Custom Metadata Types</a> in the Metadata API Developer Guide.
 * <p>Example
 * // Set up custom metadata to be created in the subscriber org.
 *     Metadata.CustomMetadata customMetadata =  new Metadata.CustomMetadata();
 *     customMetadata.fullName = 'ISVNamespace__MetadataTypeName.MetadataRecordName';
 *
 *     Metadata.CustomMetadataValue customField = new Metadata.CustomMetadataValue();
 *     customField.field = 'customField__c';
 *     customField.value = 'New value';
 *
 *     customMetadata.values.add(customField);
 * Note
 * When you assign namespaces to records, provide full, qualified record names to the app. If both the type and the record are in Namespace, use something like: customMetadata.fullName = 'Namespace__MetadataTypeName.Namespace__MetadataRecordName'
 */
global class CustomMetadata extends Metadata.Metadata {
    /**
     * The description of the custom metadata.
     * <p>String
     */
    global String description { get; set; }
    global String fullName { get; set; }
    /**
     * The label of the custom metadata record.
     * <p>String
     */
    global String label { get; set; }
    /**
     * Property that describes whether the custom metadata record is a protected component.
     * <p>Boolean
     */
    global Boolean protected_x { get; set; }
    /**
     * A list of custom metadata values, such as custom fields, for the custom metadata record.
     * <p>List<Metadata.CustomMetadataValue>
     */
    global List values { get; set; }

    global Object CustomMetadata() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}