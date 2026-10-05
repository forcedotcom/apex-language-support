/**
 * An abstract class, used to display the values of a picklist in a Lightning component on a Lightning page.
 * <p>Usage
 * To use this class as the datasource of a picklist in a Lightning component, it must be extended by a custom Apex class and then that class must be called in the component’s design file.
 * <p>Example
 * Here’s an example of a custom Apex class extending the VisualEditor.DynamicPickList class.
 * global class MyCustomPickList extends VisualEditor.DynamicPickList{
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
 *         return myValues;
 *     }
 * }
 * Here’s an example of how the custom Apex class gets called in a design file so that the picklist appears in the Lightning component.
 * <design:component>
 *         <design:attribute name="property1" datasource="apex://MyCustomPickList"/>
 * </design:component>
 */
global abstract class DynamicPickList {
    global DynamicPickList() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the picklist item that is set as the default value for the picklist.
     */
    global abstract VisualEditor.DataRow getDefaultValue();

    /**
     * Returns the user-facing label for a specified picklist value.
     */
    global virtual String getLabel(Object attributeValue) { return null; }

    /**
     * Returns the list of picklist item values.
     */
    global abstract VisualEditor.DynamicPickListRows getValues();

    global virtual VisualEditor.DynamicPickListRows getValuesForSemanticSearch(String semanticSearchQuery) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns the valid state of the picklist item’s value. A picklist value is considered valid if it’s a part of any VisualEditor.DataRow in the VisualEditor.DynamicPickListRows returned by getValues().
     */
    global virtual Boolean isValid(Object attributeValue) { return false; }

    global override virtual String toString() { return null; }
}