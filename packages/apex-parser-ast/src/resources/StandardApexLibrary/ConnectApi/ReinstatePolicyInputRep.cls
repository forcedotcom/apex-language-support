global class ReinstatePolicyInputRep {
	global List<ConnectApi.InsPolicyAddlInputIARep> additionalInput;
	global String effectiveDate;
	global ConnectApi.InsPolicyIAInputRep insurancePolicy;
	global String policyId;
	global ConnectApi.InsPolicyTrxnIAInputRep transactionRecord;
	global ReinstatePolicyInputRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}