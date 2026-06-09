/**
 * A SelectOption object specifies one of the possible values for a Visualforce selectCheckboxes , selectList , or selectRadio component.
 */
global class SelectOption {

  global SelectOption(String value, String label) {}

  global SelectOption(String value, String label, Boolean isDisabled) {}

  /**
   * Returns the current value of the SelectOption object's isDisabled attribute.
   * @return Boolean
   */
  global Boolean getDisabled() {}

  /**
   * Returns the current value of the SelectOption object's itemEscaped attribute.
   * @return Boolean
   */
  global Boolean getEscapeItem() {}

  /**
   * Returns the option label that is displayed to the user.
   * @return String
   */
  global String getLabel() {}

  /**
   * Returns the option value that is returned to the controller if a user selects the option.
   * @return String
   */
  global String getValue() {}

  /**
   * Sets the value of the SelectOption object's isDisabled attribute.
   * @param isDisabled 
   */
  global void setDisabled(Boolean isDisabled) {}

  /**
   * Sets the value of the SelectOption object's itemEscaped attribute.
   * @param itemsEscaped 
   */
  global void setEscapeItem(Boolean itemsEscaped) {}

  /**
   * Sets the value of the option label that is displayed to the user.
   * @param label 
   */
  global void setLabel(String label) {}

  /**
   * Sets the value of the option value that is returned to the controller if a user selects the option.
   * @param value 
   */
  global void setValue(String value) {}

  global Object clone() {}

}