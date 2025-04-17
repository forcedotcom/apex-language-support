global class ActivationTarget {
	global String audienceDmoApiName;
	global String audienceDmoLabel;
	global ConnectApi.DataConnector connector;
	global String dataSpace;
	global String description;
	global Boolean isCappingEnabled;
	global Boolean isEnabled;
	global String organizationId;
	global String platformName;
	global String platformPrivacyType;
	global ConnectApi.DataConnectorType platformType;
	global ConnectApi.ActivationTargetStatus status;
	global ActivationTarget() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}