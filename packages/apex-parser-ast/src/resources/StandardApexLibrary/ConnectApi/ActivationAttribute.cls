global class ActivationAttribute {
	global String activationPlatformAttrId;
	global String dataSourceType;
	global String entityName;
	global ConnectApi.AttributeFilterExpression filterExpression;
	global String preferredName;
	global ConnectApi.QueryPathConfigList queryPathConfig;
	global String referenceAttributeName;
	global ConnectApi.DataExportAttributeSource source;
	global ConnectApi.DataExportAttributeType type;
	global ActivationAttribute() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}