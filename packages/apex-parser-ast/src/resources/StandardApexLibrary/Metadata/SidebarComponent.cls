/**
 * Represents a specific custom console component to display in a container that hosts multiple components in one of the sidebars of the Salesforce console.
 * Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “SidebarComponent” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class SidebarComponent extends Metadata.MetadataValue {
    /**
     * Specifies the component type. Valid values are “KnowledgeOne”, “Lookup”, “Milestones”, “RelatedList”, “Topics”, “Files”, and “CaseExperts”.
     * String
     */
    global String componentType { get; set; }
    /**
     * If the component is a lookup field, the name of the quick action used to create a record.
     * String
     */
    global String createAction { get; set; }
    /**
     * If the component is a lookup field, lets users associate a record with this field.
     * Boolean
     */
    global Boolean enableLinking { get; set; }
    /**
     * The height of the component in the container. The unit property determines the unit of measurement, in pixels or percent.
     * Integer
     */
    global Integer height { get; set; }
    /**
     * Indicates if the component is enabled for Knowledge One.
     * Boolean
     */
    global Boolean knowledgeOneEnable { get; set; }
    /**
     * The name of the component as it displays to console users. Available for components in a container with the style of tabs or accordion.
     * String
     */
    global String label { get; set; }
    /**
     * If the component is a lookup field, the name of the field.
     * String
     */
    global String lookup { get; set; }
    /**
     * If the component is a Visualforce page, the name of the Visualforce page.
     * String
     */
    global String page_x { get; set; }
    /**
     * If the component is a related list component, the list of related list names.
     * List<Metadata.RelatedList>
     */
    global List relatedLists { get; set; }
    /**
     * The unit of measurement (pixels or percent) for the height and width of the component in the container.
     * String
     */
    global String unit { get; set; }
    /**
     * If the component is a lookup field, the name of the quick action used to update a record.
     * String
     */
    global String updateAction { get; set; }
    /**
     * The width of the component in the container. The unit property determines the unit of measurement, in pixels or percent.
     * Integer
     */
    global Integer width { get; set; }

    global SidebarComponent() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}