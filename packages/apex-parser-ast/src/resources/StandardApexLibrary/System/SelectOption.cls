/**
 * A SelectOption object specifies one of the possible values for a Visualforce selectCheckboxes , selectList , or selectRadio component.
 */
global class SelectOption {

  public SelectOption(String value, String label) {}

  public SelectOption(String value, String label, Boolean isDisabled) {}

  /**
   * Returns the current value of the SelectOption object's isDisabled attribute.
   * @return Boolean
   */
  public Boolean getDisabled() {}

  /**
   * Returns the current value of the SelectOption object's itemEscaped attribute.
   * @return Boolean
   */
  public Boolean getEscapeItem() {}

  /**
   * Returns the option label that is displayed to the user.
   * @return String
   */
  public String getLabel() {}

  /**
   * Returns the option value that is returned to the controller if a user selects the option.
   * @return String
   */
  public String getValue() {}

  /**
   * Sets the value of the SelectOption object's isDisabled attribute.
   * @param isDisabled 
   */
  public void setDisabled(Boolean isDisabled) {}

  /**
   * Sets the value of the SelectOption object's itemEscaped attribute.
   * @param itemsEscaped 
   */
  public void setEscapeItem(Boolean itemsEscaped) {}

  /**
   * Sets the value of the option label that is displayed to the user.
   * @param label 
   */
  public void setLabel(String label) {}

  /**
   * Sets the value of the option value that is returned to the controller if a user selects the option.
   * @param value 
   */
  public void setValue(String value) {}

}