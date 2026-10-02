/**
 * An abstract base class that represents a custom metadata component.
 * <p>Usage
 * You can’t create instances of this abstract class. Instead, create an instance of a specific custom metadata component class that derives from Metadata.Metadata, such as Metadata.CustomMetadata. For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/metadata.htm" target="_blank">Metadata</a> in the Metadata API Developer Guide.
 */
global abstract class Metadata extends Metadata.MetadataValue {
    /**
     * The full name of the custom metadata, which can include the namespace, type, and component name.
     * <p>String
     * The format of the full name can include the namespace, metadata type, and metadata component name. If you’re updating components in a namespace, you also need to qualify the namespace for the component in the full name. For example, the full name for a custom metadata "MDType1__mdt" component named "Component1" that is contained in the "myPackage" namespace is "myPackage__MDType1__mdt.myPackage__Component1". For more information on full name formats for different metadata types, see reference documentation on the metadata types in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank" title="HTML (New Window)">Metadata API Developer Guide</a>.
     */
    global String fullName { get; set; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}