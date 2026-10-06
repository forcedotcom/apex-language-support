/**
 * Contains color metadata information for a tab.
 * Usage
 * The getColors method of the Schema.DescribeTabResult class returns a list of Schema.DescribeColorResult objects that describe colors used in a tab.
 * The methods in the Schema.DescribeColorResult class can be called using their property counterparts. For each method starting with get, you can omit the get prefix and the ending parentheses () to call the property counterpart. For example, colorResultObj.color is equivalent to colorResultObj.getColor().
 * Example
 * This sample shows how to get the color information in the Sales app for the first tab’s first color.
 * // Get tab set describes for each app
 * List<Schema.DescribeTabSetResult> tabSetDesc = Schema.DescribeTabs();
 *
 * // Iterate through each tab set describe for each app and display the info
 * for(Schema.DescribeTabSetResult tsr : tabSetDesc) {
 *     // Display tab info for the Sales app
 *     if (tsr.getLabel() == 'Sales') {
 *         // Get color information for the first tab
 *         List<Schema.DescribeColorResult> colorDesc = tsr.getTabs()[0].getColors();
 *         // Display the icon color, theme, and context of the first color returned
 *         System.debug('Color: ' + colorDesc[0].getColor());
 *         System.debug('Theme: ' + colorDesc[0].getTheme());
 *         System.debug('Context: ' + colorDesc[0].getContext());
 *     }
 * }
 *
 * // Example debug statement output
 * // DEBUG|Color: 1797C0
 * // DEBUG|Theme: theme4
 * // DEBUG|Context: primary
 */
global class DescribeColorResult {
    global String color { get; }
    global String context { get; }
    global String theme { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the Web RGB color code, such as 00FF00.
     */
    global String getColor() { return null; }

    /**
     * Returns the color context. The context determines whether the color is the main color for the tab or not.
     */
    global String getContext() { return null; }

    /**
     * Returns the color theme.
     * @return Possible theme values include theme3, theme4, and custom.
     * theme3 is the Salesforce theme introduced during Spring ‘10.
     * theme4 is the Salesforce theme introduced in Winter ‘14 for the mobile touchscreen version of Salesforce.
     * custom is the theme name associated with a custom icon.
     */
    global String getTheme() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}