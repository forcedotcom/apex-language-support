/**
 * Represents the valid values that define a layout item.
 * <p>Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “LayoutItem” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class LayoutItem extends Metadata.MetadataValue {
    /**
     * A Wave Analytics dashboard component on a page.
     * <p>Metadata.AnalyticsCloudComponentLayoutItem
     */
    global Metadata.AnalyticsCloudComponentLayoutItem analyticsCloudComponent { get; set; }
    /**
     * Determines the field behavior.
     * <p>Metadata.UiBehavior
     */
    global Metadata.UiBehavior behavior { get; set; }
    /**
     * References a canvas app.
     * <p>String
     */
    global String canvas { get; set; }
    /**
     * References a component.
     * <p>String
     */
    global String component { get; set; }
    /**
     * The custom link reference.
     * <p>String
     */
    global String customLink { get; set; }
    /**
     * Controls if this layout item is a blank space.
     * <p>Boolean
     */
    global Boolean emptySpace { get; set; }
    /**
     * The field name reference, relative to the layout, for example “Description” or “MyField__c”.
     * <p>String
     */
    global String field { get; set; }
    /**
     * For s-controls and pages only, the height in pixels.
     * <p>Integer
     */
    global Integer height { get; set; }
    /**
     * Reference to a Visualforce page.
     * <p>String
     */
    global String page_x { get; set; }
    /**
     * Refers to a report chart that you can add to a standard or custom object page.
     * <p>Metadata.ReportChartComponentLayoutItem
     */
    global Metadata.ReportChartComponentLayoutItem reportChartComponent { get; set; }
    /**
     * Reference to an s-control.
     * <p>String
     */
    global String scontrol { get; set; }
    /**
     * For s-control and pages only, whether to show the label.
     * <p>Boolean
     */
    global Boolean showLabel { get; set; }
    /**
     * For s-control and pages only, whether to show scrollbars.
     * <p>Boolean
     */
    global Boolean showScrollbars { get; set; }
    /**
     * For s-control and pages only, the width in pixels or percent. Pixel values are simply the number of pixels, for example, 500. Percentage values must include the percent sign, for example, 20%.
     * <p>String
     */
    global String width { get; set; }

    global LayoutItem() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}