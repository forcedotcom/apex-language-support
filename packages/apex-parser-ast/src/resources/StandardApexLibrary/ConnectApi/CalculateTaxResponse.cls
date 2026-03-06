/**
 * Shows the results of a tax calculation request.
 */
global class CalculateTaxResponse {

  /**
   * Adapter error.
   */
  global ConnectApi.ErrorResponse adapterError;

  /**
   * Status of a tax transaction. Values are: Committed —Tax has been committed to the transaction. Uncommitted —Tax hasn’t been committed to the transaction.
   */
  global ConnectApi.TaxTransactionStatus status;

  /**
   * Tax engine logs.
   */
  global List < ConnectApi.TaxEngineLogResponse > taxEngineLogs;

  /**
   * Type of tax transaction. Values are: Credit —Transaction is a credit transaction. Debit —Transaction is a debit transaction. Void —Reserved for internal use in case of input. In case of output, this value specifies that the tax engine has voided the document that's mentioned as the referenceDocumentCode property value.
   */
  global ConnectApi.TaxTransactionType taxTransactionType;

  /**
   * Type of tax calculation. Values are: Actual —Calculated tax represents the final taxed amount for the transaction. Estimated —Calculated tax represents only an estimated value before the transaction is finalized.
   */
  global ConnectApi.CalculateTaxType taxType;

}