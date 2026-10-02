/**
 * Pass data between your organization and a form in Preference Manager.
 */
global interface PreferenceCenterApexHandler {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * Retrieve the record IDs and initial values from a preference form before it is edited and submitted.
     */
    abstract pref_center.LoadFormData load(pref_center.LoadParameters loadParams, pref_center.LoadFormData formData, pref_center.ValidationResult validationResult);

    /**
     * Updates the changed values of fields when the preference form is submitted.
     */
    abstract void submit(pref_center.SubmitParameters submitParams, pref_center.SubmitFormData formData, pref_center.ValidationResult validationResult);

    virtual String toString();
}