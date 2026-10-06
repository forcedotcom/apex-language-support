/**
 * Contains information about a currency value, including the amount and currency code.
 */
global class ReportCurrency {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the amount of the currency value.
     */
    global Decimal getAmount() { return 0.0; }

    /**
     * Returns the report currency code, such as USD, EUR, or GBP, for an organization that has multicurrency enabled. The value is null if the organization does not have multicurrency enabled.
     */
    global String getCurrencyCode() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}