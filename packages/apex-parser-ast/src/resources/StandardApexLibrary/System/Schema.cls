/**
 * Contains methods for obtaining schema describe information.
 */
global class Schema {
    /**
     * Returns available category groups along with their data category structure for objects specified in the request.
     */
    global static List describeDataCategoryGroupStructures(List pairs, Boolean topCategoriesOnly) { return null; }

    /**
     * Returns a list of the category groups associated with the specified objects.
     * <p>Usage
     * You can specify one of the following sObject names:
     * KnowledgeArticleVersion—to retrieve category groups associated with article types.
     * Question—to retrieve category groups associated with questions.
     * For more information and code examples using describeDataCategoryGroups, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dynamic_data_categories.htm" target="_blank">Accessing All Data Categories Associated with an sObject</a>.
     * For additional information about articles and questions, see “Work with Articles and Translations” in the Salesforce online help.
     */
    global static List describeDataCategoryGroups(List sobjects) { return null; }

    /**
     * Describes metadata (field list and object properties) for the specified sObject or array of sObjects.
     * <p>Usage
     * This method is similar to the getDescribe method on the Schema.sObjectType token. Unlike the getDescribe method, this method allows you to specify the sObject type dynamically and describe more than one sObject at a time.
     * You can first call getGlobalDescribe to retrieve a list of all objects for your organization, then iterate through the list and use describeSObjects to obtain metadata about individual objects.
     * <p>Example
     * Schema.DescribeSObjectResult[] descResult = Schema.describeSObjects(
     *                                                                    new String[]{'Account','Contact'});
     */
    global static List describeSObjects(List types) { return null; }

    global static List describeSObjects(List types, Schema.SObjectDescribeOptions options) { return null; }

    /**
     * Returns information about the standard and custom apps available to the running user.
     * <p>Usage
     * An app is a group of tabs that works as a unit to provide application functionality. For example, two of the standard Salesforce apps are “Sales” and “Service.”
     * The describeTabs method returns the minimum required metadata that can be used to render apps in another user interface. Typically, this call is used by partner applications to render Salesforce data in another user interface, such as in a mobile or connected app.
     * In the Salesforce user interface, users have access to standard apps (and can also have access to custom apps) as listed in the Salesforce app menu at the top of the page. Selecting an app name in the menu allows the user to switch between the listed apps at any time.
     * Note
     * The “All Tabs” tab isn’t included in the list of described tabs.
     * <p>Example
     * This example shows how to call the describeTabs method.
     * Schema.DescribeTabSetResult[] tabSetDesc = Schema.describeTabs();
     * This longer example shows how to obtain describe metadata information for the Sales app. For each tab, the example gets describe information, such as the icon URL, whether the tab is custom or not, and colors. The describe information is written to the debug output.
     * // Get tab set describes for each app
     * List<Schema.DescribeTabSetResult> tabSetDesc = Schema.describeTabs();
     *
     * // Iterate through each tab set describe for each app and display the info
     * for(DescribeTabSetResult tsr : tabSetDesc) {
     *     String appLabel = tsr.getLabel();
     *     System.debug('Label: ' + appLabel);
     *     System.debug('Logo URL: ' + tsr.getLogoUrl());
     *     System.debug('isSelected: ' + tsr.isSelected());
     *     String ns = tsr.getNamespace();
     *     if (ns == '') {
     *         System.debug('The ' + appLabel + ' app has no namespace defined.');
     *     }
     *     else {
     *         System.debug('Namespace: ' + ns);
     *     }
     *
     *     // Display tab info for the Sales app
     *     if (appLabel == 'Sales') {
     *         List<Schema.DescribeTabResult> tabDesc = tsr.getTabs();
     *         System.debug('-- Tab information for the Sales app --');
     *         for(Schema.DescribeTabResult tr : tabDesc) {
     *             System.debug('getLabel: ' + tr.getLabel());
     *             System.debug('getColors: ' + tr.getColors());
     *             System.debug('getIconUrl: ' + tr.getIconUrl());
     *             System.debug('getIcons: ' + tr.getIcons());
     *             System.debug('getMiniIconUrl: ' + tr.getMiniIconUrl());
     *             System.debug('getSobjectName: ' + tr.getSobjectName());
     *             System.debug('getUrl: ' + tr.getUrl());
     *             System.debug('isCustom: ' + tr.isCustom());
     *         }
     *     }
     * }
     *
     * // Example debug statement output
     * // DEBUG|Label: Sales
     * // DEBUG|Logo URL: https://MyDomainName.my.salesforce.com/img/seasonLogos/2014_winter_aloha.png
     * // DEBUG|isSelected: true
     * // DEBUG|The Sales app has no namespace defined.// DEBUG|-- Tab information for the Sales app --
     * // (This is an example debug output for the Accounts tab.)
     * // DEBUG|getLabel: Accounts
     * // DEBUG|getColors: (Schema.DescribeColorResult[getColor=236FBD;getContext=primary;getTheme=theme4;],
     * //       Schema.DescribeColorResult[getColor=236FBD;getContext=primary;getTheme=theme3;],
     * //       Schema.DescribeColorResult[getColor=236FBD;getContext=primary;getTheme=theme2;])
     * // DEBUG|getIconUrl: https://MyDomainName.my.salesforce.com/img/icon/accounts32.png
     * // DEBUG|getIcons: (Schema.DescribeIconResult[getContentType=image/png;getHeight=32;getTheme=theme3;
     * //       getUrl=https://MyDomainName.my.salesforce.com/img/icon/accounts32.png;getWidth=32;],
     * //       Schema.DescribeIconResult[getContentType=image/png;getHeight=16;getTheme=theme3;
     * //       getUrl=https://MyDomainName.my.salesforce.com/img/icon/accounts16.png;getWidth=16;])
     * // DEBUG|getMiniIconUrl: https://MyDomainName.my.salesforce.com/img/icon/accounts16.png
     * // DEBUG|getSobjectName: Account
     * // DEBUG|getUrl: https://MyDomainName.my.salesforce.com/001/o
     * // DEBUG|isCustom: false
     */
    global static List describeTabs() { return null; }

    global static Map getAppDescribe(String appName) { return null; }

    /**
     * Returns a map of all sObject names (keys) to sObject tokens (values) for the standard and custom objects defined in your organization.
     * <p>Usage
     * For more information on accessing SObjects, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dynamic_global_describe.htm" target="_blank">Accessing All sObjects</a>.
     * <p>Example
     * Map<String, Schema.SObjectType> gd =
     * Schema.getGlobalDescribe();
     */
    global static Map getGlobalDescribe() { return null; }

    global static Map getModuleDescribe() { return null; }

    global static Map getModuleDescribe(String moduleName) { return null; }
}