/**
 * Contains information about a currency value, including the amount and currency code.
 */
global class ReportCurrency {

  global ReportCurrency() {}

  /**
   * Returns the amount of the currency value.
   * @return Decimal
   */
  global Decimal getAmount() {}

  /**
   * Returns the report currency code, such as USD, EUR, or GBP, for an organization that has multicurrency enabled. The value is null if the organization does not have multicurrency enabled.
   * @return String
   */
  global String getCurrencyCode() {}

  global Object clone() {}

}