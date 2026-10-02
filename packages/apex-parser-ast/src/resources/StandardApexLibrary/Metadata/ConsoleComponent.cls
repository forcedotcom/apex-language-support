/**
 * Represents a custom console component on a section of a page layout.
 * <p>Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “ConsoleComponent” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class ConsoleComponent extends Metadata.MetadataValue {
    /**
     * The height of the custom console component in pixels.
     * <p>Integer
     */
    global Integer height { get; set; }
    /**
     * The location of the custom console component on the page layout. Valid values are right, left, top, and bottom.
     * <p>String
     */
    global String location { get; set; }
    /**
     * The unique name of the custom console component.
     * <p>String
     */
    global String visualforcePage { get; set; }
    /**
     * The width of the custom console component in pixels.
     * <p>Integer
     */
    global Integer width { get; set; }

    global Object ConsoleComponent() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}