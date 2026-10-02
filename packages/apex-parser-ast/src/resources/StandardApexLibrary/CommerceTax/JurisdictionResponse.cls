/**
 * Stores details from the external tax engine about the tax jurisdiction used in the tax calculation process. A tax jurisdiction represents a government entity that collects tax.
 * <p>Example
 * In this mock adapter example, the adapter sets the TaxDetailsResponse.setJurisdiction() method parameter to null if the request's document code indicates that the tax calculation didn't require any exceptions. Otherwise, it creates an instance of JurisdictionResponse and sets its address values. Because this code represents a mock adapter, the example defines the address parameters directly. In a standard implementation, the jurisdiction's setters receive values passed from the eternal tax engine.
 * if(request.DocumentCode == 'SetsNullForResponseWithoutException'){
 *                          taxDetailsResponse.setJurisdiction(null);
 *                      }else{
 *                         commercetax.JurisdictionResponse jurisdiction = new commercetax.JurisdictionResponse();
 *                         jurisdiction.setCountry('country');
 *                         jurisdiction.setRegion('region');
 *                         jurisdiction.setName('name');
 *                         jurisdiction.setStateAssignedNumber('stateAssignedNo');
 *                         jurisdiction.setId('id');
 *                         jurisdiction.setLevel('level');
 *                         taxDetailsResponse.setJurisdiction(jurisdiction);
 * }
 */
global with sharing class JurisdictionResponse {
    global Object JurisdictionResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the Country field of the JurisdictionResponse class.
     */
    global void setCountry(String country) { }

    /**
     * Sets the ID field of the JurisdictionResponse class.
     */
    global void setId(String id) { }

    /**
     * Sets the Level field of the JurisdictionResponse class.
     */
    global void setLevel(String level) { }

    /**
     * Sets the Name field of the JurisdictionResponse class.
     */
    global void setName(String name) { }

    /**
     * Sets the Region value of the JurisdictionResponse class.
     */
    global void setRegion(String region) { }

    /**
     * Sets the StateAssignedNumber field of the JurisdictionResponse class.
     */
    global void setStateAssignedNumber(String stateAssignedNo) { }

    global override virtual String toString() { return null; }
}