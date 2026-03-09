/**
 * Contains information about a currency value, including the amount and currency code.
 */
global class ReportCurrency {

  /**
   * Returns the amount of the currency value.
   * @return Decimal
   */
  public Decimal getAmount() {}

  /**
   * Returns the report currency code, such as USD, EUR, or GBP, for an organization that has multicurrency enabled. The value is null if the organization does not have multicurrency enabled.
   * @return String
   */
  public String getCurrencyCode() {}

}