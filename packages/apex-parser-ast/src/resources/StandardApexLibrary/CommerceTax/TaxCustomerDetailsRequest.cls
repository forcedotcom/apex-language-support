/**
 * Contains customer details used in tax calculation.
 */
global class TaxCustomerDetailsRequest {

  global TaxCustomerDetailsRequest(String accountId, String code, String exemptionNo, String exemptionReason) {}

  global String accountId;

  global String code;

  global String exemptionNo;

  global String exemptionReason;

  global String taxCertificateId;

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

  global Object clone() {}

}