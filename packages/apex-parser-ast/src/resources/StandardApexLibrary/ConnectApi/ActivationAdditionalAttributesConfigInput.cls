global class ActivationAdditionalAttributesConfigInput {
	global String activationPlatformAttrId;
	global String dataSourceType;
	global String entityName;
	global List<ConnectApi.AttributeFilterInput> filterExpression;
	global Boolean isRolluppable;
	global String label;
	global String name;
	global String preferredName;
	global List<ConnectApi.QueryPathInputConfig> queryPathConfig;
	global String referenceAttributeName;
	global ConnectApi.DataExportAttributeSource source;
	global ConnectApi.DataExportAttributeType type;
	global ActivationAdditionalAttributesConfigInput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}