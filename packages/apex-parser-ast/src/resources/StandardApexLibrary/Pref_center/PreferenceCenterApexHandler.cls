/**
 * Pass data between your organization and a form in Preference Manager.
 */
public interface PreferenceCenterApexHandler {

  pref_center.LoadFormData load(pref_center.LoadParameters loadParams, pref_center.LoadFormData formData, pref_center.ValidationResult validationResult);

  void submit(pref_center.SubmitParameters submitParams, pref_center.SubmitFormData formData, pref_center.ValidationResult validationResult);

}