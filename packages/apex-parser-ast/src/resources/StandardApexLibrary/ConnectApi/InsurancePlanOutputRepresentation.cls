global class InsurancePlanOutputRepresentation {
	global List<ConnectApi.InsuranceObjectMapRepresentation> attributes;
	global List<ConnectApi.InsurancePlanOutputRepresentation> coverages;
	global Boolean isOptional;
	global Boolean isPrimarySubscribed;
	global Boolean isSubscribed;
	global String planDescription;
	global String planId;
	global String planName;
	global InsurancePlanOutputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}