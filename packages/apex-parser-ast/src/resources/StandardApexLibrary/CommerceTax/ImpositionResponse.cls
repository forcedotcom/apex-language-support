/**
 * Stores details of tax impositions from the external tax engine.
 * Example
 * In this mock adapter example, the adapter sets the TaxDetailsResponse.setImposition() method parameter to null if the request's document code indicates that the tax calculation didn't require any exceptions. Otherwise, it creates an instance of ImpositionResponse and sets its SubType and Type values, and then assigns it to TaxDetailsResponse.
 * if(request.DocumentCode == 'SetsNullForResponseWithoutException'){
 *   taxDetailsResponse.setImposition(null);
 *                      }else{
 *                         commercetax.ImpositionResponse imposition = new commercetax.ImpositionResponse();
 *                         imposition.setSubType('subtype');
 *                         imposition.setType('type');
 *                         taxDetailsResponse.setImposition(imposition);
 *                    }
 */
global with sharing class ImpositionResponse {
    global ImpositionResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the ID field of the ImpositionResponse class.
     */
    global void setId(String id) { }

    /**
     * Sets the Name field of the ImpositionResponse class.
     */
    global void setName(String name) { }

    /**
     * Sets the SubType field of the ImpositionResponse class.
     */
    global void setSubType(String subType) { }

    /**
     * Sets the Type field of the ImpositionResponse class.
     */
    global void setType(String type) { }

    global override virtual String toString() { return null; }
}