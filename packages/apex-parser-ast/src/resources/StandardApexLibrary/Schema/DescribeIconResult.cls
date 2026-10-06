/**
 * Contains icon metadata information for a tab.
 * Usage
 * The getIcons method of the Schema.DescribeTabResult class returns a list of Schema.DescribeIconResult objects that describe colors used in a tab.
 * The methods in the Schema.DescribeIconResult class can be called using their property counterparts. For each method starting with get, you can omit the get prefix and the ending parentheses () to call the property counterpart. For example, iconResultObj.url is equivalent to iconResultObj.getUrl().
 * Example
 * This sample shows how to get the icon information in the Sales app for the first tab’s first icon.
 * // Get tab set describes for each app
 * List<Schema.DescribeTabSetResult> tabSetDesc = Schema.describeTabs();
 *
 * // Iterate through each tab set
 * for(Schema.DescribeTabSetResult tsr : tabSetDesc) {
 *     // Get tab info for the Sales app
 *     if (tsr.getLabel() == 'Sales') {
 *         // Get icon information for the first tab
 *         List<Schema.DescribeIconResult> iconDesc = tsr.getTabs()[0].getIcons();
 *         // Display the icon height and width of the first icon
 *         System.debug('Height: ' + iconDesc[0].getHeight());
 *         System.debug('Width: ' + iconDesc[0].getWidth());
 *     }
 * }
 *
 * // Example debug statement output
 * // DEBUG|Height: 32
 * // DEBUG|Width: 32
 */
global class DescribeIconResult {
    global String contenttype { get; }
    global Integer height { get; }
    global String theme { get; }
    global String url { get; }
    global Integer width { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the tab icon’s content type, such as image/png.
     */
    global String getContentType() { return null; }

    /**
     * Returns the tab icon’s height in pixels.
     * Usage
     * Note
     * If the icon content type is SVG, the icon won’t have a size and its height is zero.
     */
    global Integer getHeight() { return 0; }

    /**
     * Returns the tab’s icon theme.
     * @return Possible theme values include theme3, theme4, and custom.
     * theme3 is the Salesforce theme introduced during Spring ‘10.
     * theme4 is the Salesforce theme introduced in Winter ‘14 for the mobile touchscreen version of Salesforce.
     * custom is the theme name associated with a custom icon.
     */
    global String getTheme() { return null; }

    /**
     * Returns the tab’s icon fully qualified URL.
     */
    global String getUrl() { return null; }

    /**
     * Returns the tab’s icon width in pixels.
     * Usage
     * Note
     * If the icon content type is SVG, the icon won’t have a size and its width is zero.
     */
    global Integer getWidth() { return 0; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}