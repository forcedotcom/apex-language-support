global class InsurancePlansEligibilityOutputRepresentation {
	global String contextId;
	global List<ConnectApi.InsuranceErrorRepresentation> errors;
	global Boolean isSuccess;
	global String memberId;
	global ConnectApi.EligiblePlanDetailsOutputRepresentation planEligibilityDetails;
	global InsurancePlansEligibilityOutputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}