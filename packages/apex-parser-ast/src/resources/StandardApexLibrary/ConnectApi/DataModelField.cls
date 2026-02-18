global class DataModelField {
	global ConnectApi.DataModelFieldCreationType creationType;
	global Boolean isDistinct;
	global Boolean isMapped;
	global Boolean isPrimaryKey;
	global String keyQualifierName;
	global ConnectApi.DataModelFieldTypeEnum type;
	global ConnectApi.MktDataModelFieldUsageTag usageTag;
	global DataModelField() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}