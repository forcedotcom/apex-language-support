/**
 * Shows whether the tax transaction is for a credit or debit transaction.
 * <p>Usage
 * Used by the CalculateTaxResponse and CalculateTaxRequest class methods.
 * <p>Enum Values
 * The commercetax.TaxTransactionType enum includes these values.
 */
global enum TaxTransactionType {
    Credit,
    Debit,
    Void

}