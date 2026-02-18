global class ContactPointConfig {
	global String contactPointEntityId;
	global String contactPointEntityName;
	global String contactPointPath;
	global ConnectApi.ActivationContactPointsFieldConfig fieldConfig;
	global ConnectApi.ContactPointFilterExpression filterExpression;
	global ConnectApi.QueryPathConfigList queryPathConfig;
	global ConnectApi.ActivationContactPointsSourceConfig sourceConfig;
	global ConnectApi.ContactPointType type;
	global ContactPointConfig() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}