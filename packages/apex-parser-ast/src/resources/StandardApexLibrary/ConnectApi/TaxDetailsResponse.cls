/**
 * Tax details for each line item in a tax line item output.
 */
global class TaxDetailsResponse {

  /**
   * Amount of the line item that is exempt from taxation.
   */
  global Double exemptAmount;

  /**
   * The reason that any tax exemption applied to the line item.
   */
  global String exemptReason;

  /**
   * The business justification for applying tax to a line item.
   */
  global ConnectApi.TaxImpositionResponse imposition;

  /**
   * Business address used to calculate the tax rate for the line item.
   */
  global ConnectApi.TaxJurisdictionResponse jurisdiction;

  /**
   * Tax rate for the line item.
   */
  global Double rate;

  /**
   * Total amount of tax on the line item.
   */
  global Double tax;

  /**
   * ID for the type of tax applied to the line item.
   */
  global String taxId;

  /**
   * Amount of line item that can be taxed.
   */
  global Double taxableAmount;

}