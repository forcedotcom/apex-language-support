/**
 * Addresses, including the Bill To address, Ship From address, Ship to address, and Sold To address.
 */
global class TaxAddressesRequest {

  /**
   * Bill To address.
   */
  global ConnectApi.TaxAddressRequest billTo;

  /**
   * Ship From address.
   */
  global ConnectApi.TaxAddressRequest shipFrom;

  /**
   * Ship To address.
   */
  global ConnectApi.TaxAddressRequest shipTo;

  /**
   * Sold To address.
   */
  global ConnectApi.TaxAddressRequest soldTo;

}