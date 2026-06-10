/**
 * Represents a request to an external tax engine to calculate tax. Extends the TaxTransactionRequest class and is the top-level request class.
 */
global class CalculateTaxRequest {

  global CalculateTaxRequest(commercetax.CalculateTaxType taxType) {}

  global Boolean isCommit;

  global Boolean isHeaderTaxRequested;

  global commercetax.CalculateTaxType shouldVoidTax;

  global commercetax.TaxTransactionType taxTransactionType;

  global commercetax.CalculateTaxType taxType;

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

  global Object clone() {}

}