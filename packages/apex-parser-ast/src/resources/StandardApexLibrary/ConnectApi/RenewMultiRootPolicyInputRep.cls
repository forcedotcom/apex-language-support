global class RenewMultiRootPolicyInputRep {
	global List<ConnectApi.InsPolicyAddlInputIARep> additionalInput;
	global String contextId;
	global ConnectApi.InsPolicyIAInputRep insurancePolicy;
	global String policyId;
	global ConnectApi.InsPolicyTrxnIAInputRep transactionRecord;
	global RenewMultiRootPolicyInputRep() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}