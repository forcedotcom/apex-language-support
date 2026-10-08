/**
 * Wrapper class that stores details about the type of a tax calculation request.
 * Example
 * At the beginning of a tax adapter, use TaxEngineContext class to pass the value of a request type to an instance of RequestType.
 * global virtual class MockAdapter implements commercetax.TaxEngineAdapter {
 *
 *      global commercetax.TaxEngineResponse processRequest(commercetax.TaxEngineContext taxEngineContext) {
 *          commercetax.RequestType requestType = taxEngineContext.getRequestType();
 *          commercetax.CalculateTaxRequest request = (commercetax.CalculateTaxRequest)taxEngineContext.getRequest();
 * Build the rest of your adapter based on the type of request that you got from TaxEngineContext class.
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
 * }
 */
global with sharing class TaxEngineContext {
    /**
     * Initializes the TaxEngineContext object. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global TaxEngineContext(commercetax.TaxEngineRequest request, commercetax.RequestType requestType, String namedUri) { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Retrieves the value of the NamedUri field of the TaxEngineContext class.
     */
    global String getNamedUri() { return null; }

    /**
     * Gets the value of the TaxEngineContext's Request field.
     * @return An implemented instance of an external tax engine's interface for processing requests. We've provided the TaxEngineRequest interface for you to test within mock adapters with classes that implement it, such as CalculateTaxRequest. However, don’t use it outside of a testing context.
     */
    global commercetax.TaxEngineRequest getRequest() { return null; }

    /**
     * Gets the value of the RequestType field of the TaxEngineContext class.
     * @return Indicates whether the calculation request was for actual or calculated tax.
     */
    global commercetax.RequestType getRequestType() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}