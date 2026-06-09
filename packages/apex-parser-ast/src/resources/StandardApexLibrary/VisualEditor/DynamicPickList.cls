/**
 * An abstract class, used to display the values of a picklist in a Lightning component on a Lightning page.
 */
global class DynamicPickList {

  global DynamicPickList() {}

  /**
   * Makes a duplicate copy of the VisualEditor.DynamicPicklist object.
   * @return Object
   */
  global Object clone() {}

  /**
   * Returns the picklist item that is set as the default value for the picklist.
   * @return VisualEditor.DataRow
   */
  global VisualEditor.DataRow getDefaultValue() {}

  /**
   * Returns the user-facing label for a specified picklist value.
   * @param attributeValue The value of the picklist item.
   * @return String
   */
  global String getLabel(Object attributeValue) {}

  /**
   * Returns the list of picklist item values.
   * @return VisualEditor.DynamicPickListRows
   */
  global VisualEditor.DynamicPickListRows getValues() {}

  /**
   * Returns the valid state of the picklist item’s value. A picklist value is considered valid if it’s a part of any VisualEditor.DataRow in the VisualEditor.DynamicPickListRows returned by getValues() .
   * @param attributeValue The value of the picklist item.
   * @return Boolean
   */
  global Boolean isValid(Object attributeValue) {}

  global VisualEditor.DynamicPickListRows getValuesForSemanticSearch(String semanticSearchQuery) {}

}