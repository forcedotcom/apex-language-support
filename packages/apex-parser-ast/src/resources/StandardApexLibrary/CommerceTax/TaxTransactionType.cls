/**
 * Shows whether the tax transaction is for a credit or debit transaction.
 * Usage
 * Used by the CalculateTaxResponse and CalculateTaxRequest class methods.
 * Enum Values
 * The commercetax.TaxTransactionType enum includes these values.
 */
global enum TaxTransactionType {
    Credit,
    Debit,
    Void

}