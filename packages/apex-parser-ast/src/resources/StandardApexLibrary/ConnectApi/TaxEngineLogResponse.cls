/**
 * Shows the results of the tax calculation request to the tax engine.
 */
global class TaxEngineLogResponse {

  /**
   * The date that the gateway log was created.
   */
  global Datetime createdDate;

  /**
   * ID of the tax engine log record.
   */
  global String id;

  /**
   * Result code sent from the external tax engine. Review the tax engine provider's documentation for more information about the code.
   */
  global String resultCode;

}