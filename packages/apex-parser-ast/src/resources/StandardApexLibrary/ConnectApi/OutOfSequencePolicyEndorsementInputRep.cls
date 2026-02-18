global class OutOfSequencePolicyEndorsementInputRep {
	global String contextId;
	global String effectiveDate;
	global ConnectApi.FieldSetIDsInputRep fieldSetIds;
	global ConnectApi.InsPolicyIAInputRep insurancePolicy;
	global String policyId;
	global ConnectApi.InsPolicyTrxnIAInputRep transactionRecord;
	global OutOfSequencePolicyEndorsementInputRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}