/**
 * Represents the settings for a report chart on a standard or custom page.
 * <p>Usage
 * Use this class when accessing Metadata.Layout metadata components. For more information, see “ReportChartComponentLayoutItem” in the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_intro.htm" target="_blank">Metadata API Developer Guide</a>.
 */
global class ReportChartComponentLayoutItem extends Metadata.MetadataValue {
    /**
     * Indicates whether to use cached data when displaying the chart. When the attribute is set to true, data is cached for 24 hours. When the attribute is set to false, the report is run every time the page is refreshed.
     * <p>Boolean
     */
    global Boolean cacheData { get; set; }
    /**
     * Unique development name of the field by which a report chart is filtered to return data relevant to the page. If set, the ID field for the parent object of the page or report type is the chart data filter. The parent object for the report type and the page must match for a chart to return relevant data.
     * <p>String
     */
    global String contextFilterableField { get; set; }
    /**
     * Error string that is populated only when an error occurs in the underlying report.
     * <p>String
     */
    global String error { get; set; }
    /**
     * Controls whether users see a chart that has an error. When an error occurs and this attribute is not set, the chart doesn’t show any data except the error. Set the attribute to true to hide the chart from a page on error.
     * <p>Boolean
     */
    global Boolean hideOnError { get; set; }
    /**
     * If true, filters the report chart to return data that’s relevant to the page.
     * <p>Boolean
     */
    global Boolean includeContext { get; set; }
    /**
     * Unique development name of a report that includes a chart.
     * <p>String
     */
    global String reportName { get; set; }
    /**
     * If true, applies the title from the report to the chart.
     * <p>Boolean
     */
    global Boolean showTitle { get; set; }
    /**
     * Size of the displayed chart. The default is medium.
     * <p>Metadata.ReportChartComponentSize
     */
    global Metadata.ReportChartComponentSize size { get; set; }

    global Object ReportChartComponentLayoutItem() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}