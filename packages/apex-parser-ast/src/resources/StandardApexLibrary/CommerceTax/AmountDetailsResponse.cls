/**
 * Sets tax amount fields based on a response from the external tax engine.
 * Example
 * In this example, an instance of AmountDetailsResponse class in a mock adapter calculates several tax amount fields. The totalTax and totalAmount parameters were defined in an instance of LineItemResponse class. The adapter then assigns the instance to lineItemResponse.
 * commercetax.AmountDetailsResponse amountResponse = new commercetax.AmountDetailsResponse();
 * amountResponse.setTotalAmountWithTax(totalTax+totalAmount);
 * amountResponse.setExemptAmount(0);
 * amountResponse.setTotalAmount(totalAmount);
 * amountResponse.setTaxAmount(totalTax);
 * lineItemResponse.setAmountDetails(amountResponse);
 */
global with sharing class AmountDetailsResponse {
    global AmountDetailsResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the value of the ExemptAmount field.
     */
    global void setExemptAmount(Double exemptAmount) { }

    /**
     * Sets the value of the TaxAmount field.
     */
    global void setTaxAmount(Double taxAmount) { }

    /**
     * Sets the value of the TotalAmount field.
     */
    global void setTotalAmount(Double totalAmount) { }

    /**
     * Sets the value of the TotalAmountWithTax field.
     */
    global void setTotalAmountWithTax(Double totalAmtWithTax) { }

    global override virtual String toString() { return null; }
}