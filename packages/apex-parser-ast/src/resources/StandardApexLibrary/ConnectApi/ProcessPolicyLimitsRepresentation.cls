global class ProcessPolicyLimitsRepresentation {
	global List<ConnectApi.ErrorDetail> errors;
	global Double exceededAmount;
	global Integer exceededCount;
	global List<ConnectApi.InsPolicyLimitTrackingDetailsRep> insPolicyLimitTrackings;
	global Boolean isLimitExceeded;
	global ProcessPolicyLimitsRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}