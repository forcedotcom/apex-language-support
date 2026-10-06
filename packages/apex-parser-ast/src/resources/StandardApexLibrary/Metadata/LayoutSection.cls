/**
 * Represents a section of a page layout, such as the Custom Links section.
 * Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “LayoutSection” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class LayoutSection extends Metadata.MetadataValue {
    /**
     * Indicates if this section's label is custom or standard (built-in).
     * Boolean
     */
    global Boolean customLabel { get; set; }
    /**
     * Controls whether this heading appears on the detail page.
     * Boolean
     */
    global Boolean detailHeading { get; set; }
    /**
     * Controls whether this heading appears on the edit page.
     * Boolean
     */
    global Boolean editHeading { get; set; }
    /**
     * The label; either standard or custom, based on the customLabel property.
     * String
     */
    global String label { get; set; }
    /**
     * Lists the layout columns. You can have one, two, or three columns, ordered left to right, are possible.
     * List<Metadata.LayoutColumn>
     */
    global List layoutColumns { get; set; }
    /**
     * The style of the layout for this section.
     * Metadata.LayoutSectionStyle
     */
    global Metadata.LayoutSectionStyle style { get; set; }

    global LayoutSection() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}