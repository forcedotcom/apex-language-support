/**
 * Represents the settings for a Wave Analytics dashboard on a standard or custom page.
 * Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “AnalyticsCloudComponentLayoutItem” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class AnalyticsCloudComponentLayoutItem extends Metadata.MetadataValue {
    /**
     * Specifies the type of Wave Analytics asset.
     * String
     */
    global String assetType { get; set; }
    /**
     * Unique development name of the dashboard to add.
     * String
     */
    global String devName { get; set; }
    /**
     * An error string that is populated only when an error occurred in the underlying dashboard.
     * String
     */
    global String error { get; set; }
    /**
     * Dashboard filters for mapping data fields in the dashboard to the object’s fields.
     * String
     */
    global String filter { get; set; }
    /**
     * Specifies the height of the dashboard, in pixels.
     * Integer
     */
    global Integer height { get; set; }
    /**
     * Controls whether users see a dashboard that has an error.
     * Boolean
     */
    global Boolean hideOnError { get; set; }
    /**
     * If true, includes the dashboard’s header bar. If false, the dashboard appears without a header bar.
     * Boolean
     */
    global Boolean showHeader { get; set; }
    /**
     * If set to true, and the dashboard is shareable the dashboard shows the Share icon. If set to false, the dashboard doesn’t show the Share icon.
     * Boolean
     */
    global Boolean showSharing { get; set; }
    /**
     * If true, includes the dashboard’s title above the dashboard. If false, the dashboard appears without a title.
     * Boolean
     */
    global Boolean showTitle { get; set; }
    /**
     * Specifies the width of the dashboard, in pixels or percentage.
     * String
     */
    global String width { get; set; }

    global AnalyticsCloudComponentLayoutItem() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}