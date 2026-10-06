/**
 * Use to respond with an error after receiving errors from the PaymentGatewayAdapter methods of the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_namespace_commercepayments.htm" target="_blank" title="HTML (New Window)">CommercePayments</a> namespace, such as request-forbidden responses, custom validation errors, or expired API tokens.
 * Example
 * This example snippet of a mock tax adapter shows a hypothetical scenario to demo an error response. The adapter receives request information from TaxEngineContext and stores it in an instance of CalculateTaxRequest. If the request's documentCode property is null or indicates an error, the adapter returns an error response with information about the error.
 * global virtual class MockAdapter implements commercetax.TaxEngineAdapter {
 *
 *      global commercetax.TaxEngineResponse processRequest(commercetax.TaxEngineContext taxEngineContext) {
 *          commercetax.RequestType requestType = taxEngineContext.getRequestType();
 *          commercetax.CalculateTaxRequest request = (commercetax.CalculateTaxRequest)taxEngineContext.getRequest();
 *
 * if(request.documentCode == null) {
 *              return new commercetax.ErrorResponse(commercetax.resultcode.TaxEngineError, '404', 'documentCode  is mandatory');
 *          }
 *          if(request.documentCode == 'TaxEngineError') {
 *              return new commercetax.ErrorResponse(commercetax.resultcode.TaxEngineError, '504', 'documentCode  - not supported');
 *          }
 *          if(request.documentCode == 'simulateValidationFailureInAdapter') {
 *              return new commercetax.ErrorResponse(commercetax.resultcode.TaxEngineError, '400', 'validations for documentCode failed in adapter');
 *          }
 *          if(request.documentCode == 'simulateMalformedErrorInAdapter') {
 *                      return new commercetax.ErrorResponse(commercetax.resultcode.TaxEngineError, null, 'malformed adapter error response');
 *          }
 *          if(request.documentCode == 'simulateTaxEngineProcessFailure') {
 *              return new commercetax.ErrorResponse(commercetax.resultcode.TaxEngineError, '500', 'Tax Engine couldnt process your request');
 *          }
 */
global with sharing class ErrorResponse implements commercetax.TaxEngineResponse {
    /**
     * Constructor to initialize an ErrorResponse object from the result code, error code, and error message sent from the tax engine.
     */
    global ErrorResponse(commercetax.ResultCode resultCode, String errorCode, String errorMessage) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}