/**
 * The Ship From, Ship To, and Sold To addresses used during tax calculation.
 */
global class TaxAddressesResponse {

  /**
   * The Ship From address used in tax calculation.
   */
  global ConnectApi.TaxAddressResponse shipFrom;

  /**
   * The Ship To address used in tax calculation.
   */
  global ConnectApi.TaxAddressResponse shipTo;

  /**
   * The Sold To address used in tax calculation.
   */
  global ConnectApi.TaxAddressResponse soldTo;

}