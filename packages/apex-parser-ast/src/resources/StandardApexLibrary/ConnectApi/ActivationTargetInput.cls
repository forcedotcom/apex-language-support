global class ActivationTargetInput {
	global ConnectApi.DataConnectorInput connector;
	global String dataSpaceName;
	global String description;
	global ConnectApi.EgressPropertiesInput egressProperties;
	global Boolean isCappingEnabled;
	global String name;
	global ConnectApi.DataConnectorType platformType;
	global ActivationTargetInput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}