/**
 * Get, save, and submit a microsites marketing integration form for an Experience Cloud site.
 */
global class MarketingIntegration {

  global MarketingIntegration() {}

  public static ConnectApi.Form getForm(String siteId, String formId) {}

  public static ConnectApi.Form saveForm(String siteId, ConnectApi.FormInput formInput) {}

  public static ConnectApi.FormSubmission submitForm(String siteId, String formId, ConnectApi.FormSubmissionInput formSubmissionInput) {}

  global Object clone() {}

}