/**
 * Contains methods to retrieve information on buttons and options selected in a preference form.
 * <p>Example
 * Use methods in the SubmitFormData class to retrieve the selected values in different form components:
 * String buttonClickedId = formData.getButtonClicked();
 * if (buttonClickedId == 'submitButton') {
 * // Handle form submit
 * } else if (buttonClickedId == 'cancelButton') {
 * // Handle form cancel
 * }
 *
 * String picklistValueOld = formData.getOldSelectedValue('myPicklist');
 * String picklistValueNew = formData.getSelectedValue('myPicklist');
 * if (picklistValueOld != picklistValueNew) {
 * // Do something
 * }
 *
 * List<String> checkboxValuesOld = formData.getOldSelectedValues('myCheckbox');
 * List<String> checkboxValuesNew = formData.getSelectedValues('myCheckbox');
 * if (checkboxValuesOld != null && checkboxValuesNew != null && (checkboxValuesOld.size() != checkboxValuesNew.size())) {
 * // Do something
 * }
 *
 * String textinputValueOld = formData.getOldStringValue('myTextinput');
 * String textinputValueNew = formData.getStringValue('myTextinput');
 * if (textinputValueOld != textinputValueNew) {
 * // Do something
 * }
 */
global class SubmitFormData {
    global SubmitFormData() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the field ID of the button that was clicked in the preference form. For example, use this method to determine if the clicked button was Submit or Cancel.
     */
    global String getButtonClicked() { return null; }

    /**
     * Returns the value that was set for the specified field when the preference form was previously edited by the user. This method is used for field types such as picklist or radio buttons.
     */
    global String getOldSelectedValue(String fieldId) { return null; }

    /**
     * Returns a list of the string values that were set on a checkbox field when the preference form was previously edited by the user.
     */
    global List getOldSelectedValues(String fieldId) { return null; }

    /**
     * Returns the string value that was set on a field when the preference form was loaded. This method is used for field types such as text, and throws a TypeException if used with a field that can return more than one value, like a checkbox field.
     */
    global String getOldStringValue(String fieldId) { return null; }

    /**
     * Returns the string value that is currently selected for a picklist or radio button field in the preference form.
     */
    global String getSelectedValue(String fieldId) { return null; }

    /**
     * Returns a list of string values that are currently selected on a checkbox field in the preference form.
     */
    global List getSelectedValues(String fieldId) { return null; }

    /**
     * Returns the string value that was set on a field when the preference form was loaded. This method is used for field types such as text.
     */
    global String getStringValue(String fieldId) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}