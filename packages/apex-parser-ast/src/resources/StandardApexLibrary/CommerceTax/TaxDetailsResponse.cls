/**
 * Stores details of the tax values that an external tax engine calculates in response to a tax calculation request.
 * <p>Usage
 * If your tax calculation request contains multiple line items, we recommend building your adapter using a list of TaxDetailsResponse instances. Each instance represents the tax details calculated for a given line item.
 * <p>Example
 * List<commercetax.TaxDetailsResponse> taxDetailsResponses = new List<commercetax.TaxDetailsResponse>();
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
global with sharing class TaxDetailsResponse {
    global Object TaxDetailsResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Uses an instance of CustomTaxAttributesResponse class to include additional attributes in the tax response at the tax line item level.
     */
    global void setCustomTaxAttributes(commercetax.CustomTaxAttributesResponse customTaxAttributes) { }

    /**
     * Sets the ExemptAmount field of the TaxDetailsResponse class.
     */
    global void setExemptAmount(Double exemptAmount) { }

    /**
     * Sets the ExemptReason field of the TaxDetailsResponse class.
     */
    global void setExemptReason(String reason) { }

    /**
     * Sets the Imposition field of the TaxDetailsResponse class using an instance of the ImpositionResponse class.
     */
    global void setImposition(commercetax.ImpositionResponse imposition) { }

    /**
     * Sets the Jurisdiction field of the TaxDetailsResponse using an instance of the JurisdictionResponse class.
     */
    global void setJurisdiction(commercetax.JurisdictionResponse jurisdiction) { }

    /**
     * Sets the Rate field of the TaxDetailsResponse class.
     */
    global void setRate(Double rate) { }

    /**
     * Sets the Service Code field of the TaxDetailsResponse class.
     */
    global void setSerCode(String serCode) { }

    /**
     * Sets the Tax field of the TaxDetailsResponse class.
     */
    global void setTax(Double tax) { }

    /**
     * Sets the TaxAuthorityTypeId field of the TaxDetailsResponse class.
     */
    global void setTaxAuthorityTypeId(String taxAuthorityTypeId) { }

    /**
     * Sets the TaxId field of the TaxDetailsResponse class.
     */
    global void setTaxId(String taxId) { }

    /**
     * Sets the TaxRegionId field on the TaxDetailsResponse class.
     */
    global void setTaxRegionId(String taxRegionId) { }

    /**
     * Sets the TaxRuleDetails field of the TaxDetailsResponse class.
     */
    global void setTaxRuleDetails(commercetax.RuleDetailsResponse taxRuleDetails) { }

    /**
     * Sets the TaxableAmount field of the TaxDetailsResponse class.
     */
    global void setTaxableAmount(Double taxableAmount) { }

    global override virtual String toString() { return null; }
}