global class InsurancePlanRatingRepresentation {
	global ConnectApi.InsuranceContributionRepresentation contributions;
	global List<ConnectApi.InsuranceCoverageRatingRepresentation> coverages;
	global List<ConnectApi.InsuranceErrorRepresentation> errors;
	global String id;
	global ConnectApi.InsuranceObjectMapRepresentation proratedRates;
	global ConnectApi.InsuranceObjectMapRepresentation rates;
	global InsurancePlanRatingRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}