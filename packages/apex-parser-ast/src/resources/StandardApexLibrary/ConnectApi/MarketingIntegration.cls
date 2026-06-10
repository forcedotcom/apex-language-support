/**
 * Get, save, and submit a microsites marketing integration form for an Experience Cloud site.
 */
global class MarketingIntegration {

  global MarketingIntegration() {}

  global static ConnectApi.Form getForm(String siteId, String formId) {}

  global static ConnectApi.Form saveForm(String siteId, ConnectApi.FormInput formInput) {}

  global static ConnectApi.FormSubmission submitForm(String siteId, String formId, ConnectApi.FormSubmissionInput formSubmissionInput) {}

  global Object clone() {}

}