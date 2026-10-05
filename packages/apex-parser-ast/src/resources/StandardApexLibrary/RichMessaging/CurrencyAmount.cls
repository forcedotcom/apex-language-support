/**
 * Represents a monetary amount in a specific currency.
 */
global with sharing class CurrencyAmount {
    /**
     * The numeric amount value.
     * <p>Decimal
     */
    @InvocableVariable
    global Decimal amount;
    @InvocableVariable
    global String currencyCode;

    global CurrencyAmount() { }

    global CurrencyAmount(String currencyCode, Decimal amount) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}