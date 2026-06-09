/**
 * Contains details about the tax rules used for tax calculation.
 */
global class RuleDetailsResponse {

  global RuleDetailsResponse() {}

  global void RuleDetailsResponse() {}

  global void setNonTaxableRuleId(String nonTaxableRuleId) {}

  global void setNonTaxableType(String nonTaxableType) {}

  global void setRateRuleId(String rateRuleId) {}

  global void setRateSourceId(String rateSourceId) {}

  global Object clone() {}

  global java:commerce.tax.impl.engine.integration.response.RuleDetailsEngineResponse getDelegate() {}

}