/**
 * Request to sent through the tax adapter to the external tax engine. Inputs with a TaxTransactionType of Debit represent a tax calculation request. Inputs with a TaxTransactionType of Credit represent a tax cancellation request.
 */
global class CalculateTaxRequest extends ConnectApi.TaxTransactionRequest {

  /**
   * Commits the transaction for tax calculation.
   */
  global Boolean isCommit;

  /**
   * Indicates whether header tax is enabled in the tax engine ( true ) or not ( false ).
   */
  global Boolean isHeaderTaxRequested;

  /**
   * Indicates whether to void the tax transaction associated with a document that's mentioned as the referenceDocumentCode property value with taxType property value as Actual and isCommit property value set to true . Keep these considerations in mind when you use this property. If the shouldVoidTax property value is set to true , then the operation returns a response with documentCode property value updated to referenceDocumentCode property value that was originally sent in the request payload. The response also includes the taxTransactionType property value as Void . This indicates that the document specified in the referenceDocumentCode property value is voided. If document is locked or you can't void the tax transaction for any reason, then you can use the Tax Calculation request to perform another transaction such as a Credit Tax request. In this scenario, the response includes the documentCode property value that was sent in the request payload. If the document that's mentioned in the referenceDocumentCode property value isn't available in the tax engine, then an error response occurs with ResultCode value as ReferenceDocumentCodeMissing .
   */
  global Boolean shouldVoidTax;

  /**
   * ID of the Salesforce tax engine entity used to represent the external tax engine.
   */
  global String taxEngineId;

  /**
   * Type of tax transaction. Values are: Credit —Transaction is a credit transaction. Debit —Transaction is a debit transaction. Void —Reserved for internal use in case of input. In case of output, this value specifies that the tax engine has voided the document that's mentioned as the referenceDocumentCode property value.
   */
  global ConnectApi.TaxTransactionType taxTransactionType;

  /**
   * Type of tax calculation. Values are: Actual —Calculated tax represents the final taxed amount for the transaction. Estimated —Calculated tax represents only an estimated value before the transaction is finalized.
   */
  global ConnectApi.CalculateTaxType taxType;

}