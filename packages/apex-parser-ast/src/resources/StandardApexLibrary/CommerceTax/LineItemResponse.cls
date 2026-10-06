/**
 * Response class that stores details of a list of one or more line items on which the tax engine has calculated tax.
 * Example
 * This example uses a LineItemResponse list to store information about each line item that was processed as part of the request. For simplicity, the sample code uses a static value of 1 for the tax rate. However, most integrations typically have a more complex process for determining a tax rate. Most integrations also build a TaxDetailsResponse list to store the actual tax value information that they assign to each line item in the LineItemResponse list.
 * Double totalTax = 0.0;
 *              Double totalAmount = 0.0;
 *              List<commercetax.LineItemResponse> lineItemResponses = new List<commercetax.LineItemResponse>();
 *              for(Commercetax.TaxLineItemRequest lineItem : request.lineItems){
 *                  commercetax.AddressesResponse addressesRes = new commercetax.AddressesResponse();
 *                  if(request.DocumentCode == 'SetsNullForResponseWithoutException'){
 *                      addressesRes.setShipFrom(null);
 *                      addressesRes.setShipTO(null);
 *                      addressesRes.setSoldTo(null);
 *                  }else{
 *                      commercetax.AddressResponse addRes = new commercetax.AddressResponse();
 *                      addRes.setLocationCode('locationCode');
 *                      addressesRes.setShipFrom(addRes);
 *                      addressesRes.setShipTO(addRes);
 *                      addressesRes.setSoldTo(addRes);
 *                  }
 *                  commercetax.LineItemResponse lineItemResponse = new commercetax.LineItemResponse();
 *                  Double totalLineTax = 0;
 *                  List<commercetax.TaxDetailsResponse> taxDetailsResponses = new List<commercetax.TaxDetailsResponse>();
 *                  for(integer i =0;i<1;i++){
 *                      Integer rate  = 1;
 *                      Double taxableAmount = lineItem.amount;
 *                      commercetax.TaxDetailsResponse taxDetailsResponse = new commercetax.TaxDetailsResponse();
 *                      taxDetailsResponse.setRate(Double.valueOf(rate));
 *                      taxDetailsResponse.setTaxableAmount(taxableAmount);
 *                      Double tax = taxableAmount*rate;
 *                      totalLineTax+=tax;
 *                      taxDetailsResponse.setTax(taxableAmount*rate);
 *                      taxDetailsResponse.setExemptAmount(0);
 *                      taxDetailsResponse.setExemptReason('exemptReason');
 *                      taxDetailsResponse.setTaxRegionId('taxRegionId');
 *                      taxDetailsResponse.setTaxId(String.valueOf(getRandomInteger(0,2323233)));
 *                      taxDetailsResponse.setSerCode('serCode');
 *                      taxDetailsResponse.setTaxAuthorityTypeId('taxAuthorityTypeId');
 *                      if(request.DocumentCode == 'SetsNullForResponseWithoutException'){
 *                          taxDetailsResponse.setImposition(null);
 *                      }else{
 *                          commercetax.ImpositionResponse imposition = new commercetax.ImpositionResponse();
 *                          imposition.setSubType('subtype');
 *                          imposition.setType('type');
 *                          taxDetailsResponse.setImposition(imposition);
 *                      }
 *
 *                      if(request.DocumentCode == 'SetsNullForResponseWithoutException'){
 *                          taxDetailsResponse.setJurisdiction(null);
 *                      }else{
 *                          commercetax.JurisdictionResponse jurisdiction = new commercetax.JurisdictionResponse();
 *                          jurisdiction.setCountry('country');
 *                          jurisdiction.setRegion('region');
 *                          jurisdiction.setName('name');
 *                          jurisdiction.setStateAssignedNumber('stateAssignedNo');
 *                          jurisdiction.setId('id');
 *                          jurisdiction.setLevel('level');
 *                          taxDetailsResponse.setJurisdiction(jurisdiction);
 *                      }
 *
 *                      taxDetailsResponses.add(taxDetailsResponse);
 *                  }
 *                  lineItemResponse.setTaxes(taxDetailsResponses);
 *                  totalTax +=totalLineTax;
 *                  totalAmount+=lineItem.amount;
 */
global with sharing class LineItemResponse {
    global LineItemResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the Addresses field on the LineItemResponse using an instance of AddressesResponse class.
     */
    global void setAddresses(commercetax.AddressesResponse addresses) { }

    /**
     * Sets the Amount Details field on the LineItemResponse using an instance of AmountDetails.
     */
    global void setAmountDetails(commercetax.AmountDetailsResponse amountDetails) { }

    /**
     * Uses an instance of CustomTaxAttributesResponse class to include additional attributes in the tax response at line item level.
     */
    global void setCustomTaxAttributes(commercetax.CustomTaxAttributesResponse customTaxAttributes) { }

    /**
     * Sets the EffectiveDate field on the LineItemResponse class. Effective Date fields are optional fields that store the date that a transaction takes effect. We provide these fields only for recordkeeping purposes – for example, if you must report an effective date to an external general ledger system. Salesforce doesn't use them to calculate any tax or payment values.
     */
    global void setEffectiveDate(Datetime effectiveDate) { }

    /**
     * Sets the IsTaxable field on the LineItemResponse class.
     */
    global void setIsTaxable(Boolean isTaxable) { }

    /**
     * Sets the LineNumber field on the LineItemResponse class.
     */
    global void setLineNumber(String lineNumber) { }

    /**
     * Sets the ProductCode field on the LineItemResponse class.
     */
    global void setProductCode(String productCode) { }

    /**
     * Sets the Quantity field on the LineItemResponse class.
     */
    global void setQuantity(Double quantity) { }

    /**
     * Sets the TaxCode field on the LineItemResponse.
     */
    global void setTaxCode(String taxCode) { }

    /**
     * Sets the Taxes field on a LineItemResponse.
     */
    global void setTaxes(List taxes) { }

    global override virtual String toString() { return null; }
}