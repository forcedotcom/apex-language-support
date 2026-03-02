/**
 * A SelectOption object specifies one of the possible values for a Visualforce selectCheckboxes , selectList , or selectRadio component.
 */
public class SelectOption {

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
   * @return Void
   */
  public Void setDisabled(Boolean isDisabled) {}

  /**
   * Sets the value of the SelectOption object's itemEscaped attribute.
   * @param itemsEscaped 
   * @return Void
   */
  public Void setEscapeItem(Boolean itemsEscaped) {}

  /**
   * Sets the value of the option label that is displayed to the user.
   * @param label 
   * @return Void
   */
  public Void setLabel(String label) {}

  /**
   * Sets the value of the option value that is returned to the controller if a user selects the option.
   * @param value 
   * @return Void
   */
  public Void setValue(String value) {}

}