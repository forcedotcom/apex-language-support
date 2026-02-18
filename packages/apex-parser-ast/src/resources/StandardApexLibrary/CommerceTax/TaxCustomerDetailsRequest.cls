global class TaxCustomerDetailsRequest {
	global String accountId;
	global String additionalTaxIdentificationDetails;
	global String billingProfileId;
	global String code;
	global String deliveryTerms;
	global Datetime exemptionExpirationDate;
	global String exemptionNo;
	global String exemptionReason;
	global String exemptionStatus;
	global String taxIdentificationNumber;
	global TaxCustomerDetailsRequest(String accountId, String code, String exemptionNo, String exemptionReason) { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}