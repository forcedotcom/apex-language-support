/**
 * Represents a location and style in which to display more than one custom console component in the sidebars of the console.
 * Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “Container” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class Container extends Metadata.MetadataValue {
    /**
     * The height of the component’s container. The unit property determines the unit of measurement, in pixels or percent.
     * Integer
     */
    global Integer height { get; set; }
    /**
     * If set to true, stacked console components in the sidebars autosize vertically.
     * Boolean
     */
    global Boolean isContainerAutoSizeEnabled { get; set; }
    /**
     * The location of the component’s container (right, left, bottom, top).
     * String
     */
    global String region { get; set; }
    /**
     * Represents a specific custom console component to display in the components’ container.
     * List<Metadata.SidebarComponent>
     */
    global List sidebarComponents { get; set; }
    /**
     * The style of the container in which to display multiple components (stack, tab, accordion).
     * String
     */
    global String style { get; set; }
    /**
     * The unit of measurement, in pixels or percent, for the height or width of the components’ container.
     * String
     */
    global String unit { get; set; }
    /**
     * The width of the component’s container. The unit property determines the unit of measurement, in pixels or percent.
     * Integer
     */
    global Integer width { get; set; }

    global Container() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}