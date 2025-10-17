global class InsuranceCoverageRatingRepresentation {
	global ConnectApi.InsuranceContributionRepresentation contributions;
	global String coverageId;
	global List<ConnectApi.InsuranceErrorRepresentation> errors;
	global ConnectApi.InsuranceObjectMapRepresentation proratedRates;
	global ConnectApi.InsuranceObjectMapRepresentation rates;
	global InsuranceCoverageRatingRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}