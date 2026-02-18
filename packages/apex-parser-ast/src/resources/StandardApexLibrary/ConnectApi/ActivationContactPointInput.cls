global class ActivationContactPointInput {
	global List<ConnectApi.ContactPointAttributeInput> attributesConfig;
	global String entityName;
	global String externalPlatformHashMethod;
	global List<ConnectApi.DMOFilterInput> filterExpression;
	global List<ConnectApi.QueryPathInputConfig> queryPathConfig;
	global List<ConnectApi.ContactPointSourceInput> sourcesConfig;
	global ConnectApi.ContactPointType type;
	global ActivationContactPointInput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}