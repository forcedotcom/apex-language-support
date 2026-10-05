/**
 * Contains details about the tax rules used for tax calculation.
 */
global with sharing class RuleDetailsResponse {
    global RuleDetailsResponse() { }

    /**
     * Contains information about the tax rules used when calculating tax for line items.
     */
    global void RuleDetailsResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the NonTaxableRuleId field of the RuleDetailsResponse.
     */
    global void setNonTaxableRuleId(String nonTaxableRuleId) { }

    /**
     * Sets the NonTaxableType field of the RuleDetailsResponse.
     */
    global void setNonTaxableType(String nonTaxableType) { }

    /**
     * Sets the RateRuleId field of the RuleDetailsResponse.
     */
    global void setRateRuleId(String rateRuleId) { }

    /**
     * Sets the RateSourceId field on the RuleDetailsResponse.
     */
    global void setRateSourceId(String rateSourceId) { }

    global override virtual String toString() { return null; }
}