/**
 * Retrieve records related to the tokenized record id, and populate the values of a preference form.
 * <p>Example
 * Use methods in the LoadFormData class to set available and selected values in different form components:
 * List<System.SelectOption> picklistOptions = new List<System.SelectOption>();
 * picklistOptions.add(new System.SelectOption('optIn', 'Opt In'));
 * picklistOptions.add(new System.SelectOption('optOut', 'Opt Out'));
 *
 * // Set the available options for the picklist
 * loadFormData.setOptions('myPicklist', picklistOptions);
 * // Add an option to the existing options for the picklist
 * loadFormData.addOption('myPicklist', 'optOutAll', 'Opt Out All');
 * // Select the 'optIn' option in the picklist
 * loadFormData.setSelectedOption('myPicklist', 'optIn');
 *
 *
 * List<System.SelectOption> checkboxOptions = new List<System.SelectOption>();
 * checkboxOptions.add(new System.SelectOption('yes', 'Yes'));
 * checkboxOptions.add(new System.SelectOption('no', 'No'));
 *
 *
 * // Set available options for the checkbox group
 * loadFormData.setOptions('myCheckbox', checkboxOptions);
 * // Select the 'yes' option in the checkbox group
 * loadFormData.addSelectedOption('myCheckbox', 'yes');
 * // Also select the 'no' option in the checkbox group
 * loadFormData.addSelectedOption('myCheckbox', 'no');
 * // Another way to select both the 'yes' and 'no' options in the checkbox group
 * loadFormData.setSelectedOptions('myCheckbox', new List<String>{'yes', 'no'});
 *
 *
 * // Fill the value in the text input
 * loadFormData.setTextValue('myTextInput', 'admin@example.com');
 * // Set the hint text for the text input
 * loadFormData.setTextHint('myTextInput', 'Email Address');
 *
 *
 * // Set the label for the button
 * loadFormData.setButtonLabel('myButton', 'Save Preferences');
 */
global class LoadFormData {
    global LoadFormData() { }

    /**
     * Creates an instance of the LoadFormData class for running tests on any custom Apex classes you create for Preference Manager.
     * <p>Usage
     * This constructor is available in API version 56.0 and later.
     */
    global LoadFormData(Map data) { }

    /**
     * Add a defined, selectable option for a checkbox, picklist, or radio button field in a preference form.
     */
    global void addOption(String fieldId, System.SelectOption option) { }

    /**
     * Add an option for a checkbox, picklist, or radio button field in a preference form using the label and value.
     */
    global void addOption(String fieldId, String value, String label) { }

    /**
     * Add a selected option for a checkbox field in a preference form. This requires the field on the form to have a defined option with a set value.
     */
    global void addSelectedOption(String fieldId, String option) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Set the label of a button added to the preference form.
     */
    global void setButtonLabel(String fieldId, String label) { }

    /**
     * Add a list of selectable options for a field on a preference form.
     */
    global void setOptions(String fieldId, List options) { }

    /**
     * For a picklist or radio button field on a preference form that has defined values, set the value entered in the optionValue field as the selected option.
     */
    global void setSelectedOption(String fieldId, String optionValue) { }

    /**
     * For an existing checkbox field on a preference form that has defined values, set the values entered in the options field as the selected options. This requires the field on the form to have defined options with a set value.
     */
    global void setSelectedOptions(String fieldId, List options) { }

    /**
     * Set the hint text inside a text input field. The hint text tells the user what type of information to enter, like an email address.
     */
    global void setTextHint(String fieldId, String hintText) { }

    /**
     * Set the value of a text field in a preference form.
     */
    global void setTextValue(String fieldId, String value) { }

    global override virtual String toString() { return null; }
}