/**
 * Contains metadata information about a Salesforce Classic standard or custom app available in the Salesforce user interface.
 * <p>Usage
 * The Schema.describeTabs method returns a list of Schema.DescribeTabSetResult objects that describe Salesforce Classic standard and custom apps.
 * The methods in the Schema.DescribeTabSetResult class can be called using their property counterparts. For each method starting with get, you can omit the get prefix and the ending parentheses () to call the property counterpart. For example, tabSetResultObj.label is equivalent to tabSetResultObj.getLabel(). Similarly, for each method starting with is, omit the is prefix and the ending parentheses (). For example, tabSetResultObj.isSelected is equivalent to tabSetResultObj.selected.
 * <p>Example
 * This example shows how to call the Schema.describeTabs method to get describe information for all available Salesforce Classic apps. This example iterates through each describe result and gets more metadata information for the Sales app.
 * // App we're interested to get more info about
 * String appName = 'Sales';
 *
 * // Get tab set describes for each app
 * List<Schema.DescribeTabSetResult> tabSetDesc = Schema.describeTabs();
 *
 * // Iterate through each tab set describe for each app and display the info
 * for(Schema.DescribeTabSetResult tsr : tabSetDesc) {
 *     // Get more information for the Sales app
 *     if (tsr.getLabel() == appName) {
 *         // Find out if the app is selected
 *         if (tsr.isSelected()) {
 *             System.debug('The ' + appName + ' app is selected. ');
 *         }
 *         // Get the app's Logo URL and namespace
 *         String logo = tsr.getLogoUrl();
 *         System.debug('Logo URL: ' + logo);
 *         String ns = tsr.getNamespace();
 *         if (ns == '') {
 *             System.debug('The ' + appName + ' app has no namespace defined.');
 *         }
 *         else {
 *             System.debug('Namespace: ' + ns);
 *         }
 *         // Get the number of tabs
 *         System.debug('The ' + appName + ' app has ' + tsr.getTabs().size() + ' tabs.');
 *     }
 * }
 *
 * // Example debug statement output
 * // DEBUG|The Sales app is selected.
 * // DEBUG|Logo URL: https://MyDomainName.my.salesforce.com/img/seasonLogos/2014_winter_aloha.png
 * // DEBUG|The Sales app has no namespace defined.
 * // DEBUG|The Sales app has 14 tabs.
 */
global class DescribeTabSetResult {
    global String description { get; }
    global String label { get; }
    global String logourl { get; }
    global String namespace { get; }
    global Boolean selected { get; }
    global List tabs { get; }
    global String tabsetid { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the display description for the standard or custom app.
     */
    global String getDescription() { return null; }

    /**
     * Returns the display label for the standard or custom app.
     * <p>Usage
     * The display label changes when tabs are renamed in the Salesforce user interface. See the Salesforce online help for more information.
     */
    global String getLabel() { return null; }

    /**
     * Returns a fully qualified URL to the logo image associated with the standard or custom app.
     */
    global String getLogoUrl() { return null; }

    /**
     * Returns the developer namespace prefix of a Salesforce AppExchange managed package.
     * <p>Usage
     * This namespace prefix corresponds to the namespace prefix of the Developer Edition organization that was enabled to allow publishing a managed package. This method applies to a custom app containing a set of tabs and installed as part of a managed package.
     */
    global String getNamespace() { return null; }

    global String getTabSetId() { return null; }

    /**
     * Returns metadata information about the standard or custom app’s displayed tabs.
     */
    global List getTabs() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns true if this standard or custom app is the user’s currently selected app in Salesforce Classic. Otherwise, returns false.
     */
    global Boolean isSelected() { return false; }

    global String toString() { return null; }
}