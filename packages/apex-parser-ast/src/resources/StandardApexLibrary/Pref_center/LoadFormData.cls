/**
 * Retrieve records related to the tokenized record id, and populate the values of a preference form.
 */
global class LoadFormData {

  public void addOption(String fieldId, String value, String label) {}

  public void addOption(String fieldId, System.SelectOption option) {}

  public void addSelectedOption(String fieldId, String option) {}

  public void setButtonLabel(String fieldId, String label) {}

  public void setOptions(String fieldId, List<System.SelectOption> options) {}

  public void setSelectedOption(String fieldId, String optionValue) {}

  public void setSelectedOptions(String fieldId, List< String > options) {}

  public void setTextHint(String fieldId, String hintText) {}

  public void setTextValue(String fieldId, String value) {}

}