/**
 * Sets the values of the tax transaction following a response from the external tax engine. Extends the AbstractTransactionResponse class and is the top-level response class.
 * <p>Example
 * if(requestType == commercetax.RequestType.CalculateTax){
 *              commercetax.calculatetaxtype type = request.taxtype;
 *              String docCode='';
 *              if(request.DocumentCode == 'simulateEmptyDocumentCode')
 *                  docCode = '';
 *              else if(request.DocumentCode != null)
 *                  docCode =request.DocumentCode;
 *              else if(request.ReferenceEntityId != null) docCode = request.ReferenceEntityId;
 *              else docCode =  String.valueOf(getRandomInteger(0,2147483647));
 *              commercetax.CalculateTaxResponse response = new commercetax.CalculateTaxResponse();
 *              if(request.isCommit == true) {
 *                  response.setStatus(commercetax.TaxTransactionStatus.Committed);
 *              } else {
 *                  response.setStatus(commercetax.TaxTransactionStatus.Uncommitted);
 *              }
 *              response.setDocumentCode(docCode);
 *              response.setReferenceDocumentCode(request.referenceDocumentCode);
 *              response.setTaxType(type);
 *              response.setStatusDescription('statusDescription');
 *              if(request.sellerDetails.code == 'testSellerCode') {
 *                  response.setDescription('SellerCode fetched from TaxEngine entity');
 *              }
 *              else {
 *                  response.setDescription('description');
 *              }
 *             response.setEffectiveDate(system.now());
 *             if(request.transactionDate == null) {
 *                response.setTransactionDate(system.now());
 *             } else {
 *                response.setTransactionDate(request.transactionDate);
 *             }
 *             if(request.taxTransactionType == null) {
 *                 response.setTaxTransactionType(commercetax.TaxTransactionType.Debit);
 *             } else {
 *                 response.setTaxTransactionType(request.taxTransactionType);
 *             }
 *              if(request.currencyIsoCode == null || request.currencyIsoCode == '') {
 *                 response.setCurrencyIsoCode('USD');
 *              } else {
 *                 response.setCurrencyIsoCode(request.currencyIsoCode);
 *              }
 *              response.setReferenceEntityId(request.ReferenceEntityId);
 * }
 */
global with sharing class CalculateTaxResponse extends commercetax.AbstractTransactionResponse implements commercetax.TaxEngineResponse {
    global Object CalculateTaxResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the value of the Addresses field using the addresses contained in an instance of the AddressesResponse class.
     */
    global void setAddresses(commercetax.AddressesResponse addresses) { }

    /**
     * Sets the value of the AmountDetails field using an instance of AmountDetailsResponse.
     */
    global void setAmountDetails(commercetax.AmountDetailsResponse amountDetails) { }

    /**
     * Sets the value of the CurrencyIsoCode field of the CalculateTaxResponse object.
     */
    global void setCurrencyIsoCode(String currencyIsoCode) { }

    global void setCustomTaxAttributes(commercetax.CustomTaxAttributesResponse customTaxAttributes) { }

    /**
     * Sets the value of the Description field of the CalculateTaxResponse object.
     */
    global void setDescription(String dscptn) { }

    /**
     * Sets the value of the DocumentCode field of the CalculateTaxResponse object.
     */
    global void setDocumentCode(String documentCode) { }

    /**
     * Sets the value of the EffectiveDate field of the CalculateTaxResponse object.
     */
    global void setEffectiveDate(Datetime effectiveDate) { }

    /**
     * Sets the value of the LineItems field of the CalculateTaxResponse object.
     */
    global void setLineItems(List lineItems) { }

    /**
     * Sets the value of the ReferenceDocumentCode field of the CalculateTaxResponse object.
     */
    global void setReferenceDocumentCode(String referenceDocumentCode) { }

    /**
     * Sets the value of the ReferenceEntityId field of the CalculateTaxResponse object.
     */
    global void setReferenceEntityId(String referenceEntityId) { }

    /**
     * Sets the value of the Status field of the CalculateTaxResponse object.
     */
    global void setStatus(commercetax.TaxTransactionStatus status) { }

    /**
     * Sets the value of the StatusDescription field of the CalculateTaxResponse object.
     */
    global void setStatusDescription(String statusDescription) { }

    /**
     * Sets the value of the TaxTransactionId field of the CalculateTaxResponse object.
     */
    global void setTaxTransactionId(String taxTrxnId) { }

    /**
     * Sets the value of the TaxTransactionType field of the CalculateTaxResponse object.
     */
    global void setTaxTransactionType(commercetax.TaxTransactionType taxTransactionType) { }

    /**
     * Sets the value of the TaxType field of the CalculateTaxResponse object.
     */
    global void setTaxType(commercetax.CalculateTaxType taxType) { }

    /**
     * Sets the value of the TransactionDate field of the CalculateTaxResponse object.
     */
    global void setTransactionDate(Datetime transactionDate) { }

    global override virtual String toString() { return null; }
}