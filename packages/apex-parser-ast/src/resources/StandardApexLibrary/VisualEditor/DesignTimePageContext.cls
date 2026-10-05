/**
 * A class that provides context information about a Lightning page. It can be used to help define the values of a picklist in a Lightning component on a Lightning page based on the page’s type and the object with which it’s associated.
 * <p>Usage
 * To use this class, create a parameterized constructor in the custom Apex class that extends VisualEditor.DynamicPickList.
 * <p>Example
 * Here’s an example of a custom Apex class extending the VisualEditor.DynamicPickList class. It includes VisualEditor.DesignTimePageContext to define a picklist value that is available only if the page type is HomePage.
 * global class MyCustomPickList extends VisualEditor.DynamicPickList{
 *     VisualEditor.DesignTimePageContext context;
 *
 *     global MyCustomPickList(VisualEditor.DesignTimePageContext context) {
 *        this.context = context;
 *     }
 *
 *     global override VisualEditor.DataRow getDefaultValue(){
 *         VisualEditor.DataRow defaultValue = new VisualEditor.DataRow('red', 'RED');
 *         return defaultValue;
 *     }
 *     global override VisualEditor.DynamicPickListRows getValues() {
 *         VisualEditor.DataRow value1 = new VisualEditor.DataRow('red', 'RED');
 *         VisualEditor.DataRow value2 = new VisualEditor.DataRow('yellow', 'YELLOW');
 *         VisualEditor.DynamicPickListRows  myValues = new VisualEditor.DynamicPickListRows();
 *         myValues.addRow(value1);
 *         myValues.addRow(value2);
 *
 *         if (context.pageType == 'HomePage') {
 *             VisualEditor.DataRow value3 = new VisualEditor.DataRow('purple', 'PURPLE');
 *             myValues.addRow(value3);
 *         }
 *
 *         return myValues;
 *     }
 * }
 */
global class DesignTimePageContext {
    /**
     * The API name of the sObject that a Lightning page is associated with, such as Account, Contact, or Custom_object__c. entityName is available only for object pages, and not all Lightning pages are associated with objects.
     * <p>String
     */
    global String entityName { get; set; }
    /**
     * The type of Lightning page, such as HomePage, AppPage, or RecordPage.
     * <p>String
     */
    global String pageType { get; set; }

    global DesignTimePageContext() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}