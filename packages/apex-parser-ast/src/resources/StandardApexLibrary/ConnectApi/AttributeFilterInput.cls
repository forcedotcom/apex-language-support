global class AttributeFilterInput {
	global String attributeId;
	global String attributeName;
	global ConnectApi.FilterDateUnit dateUnits;
	global String operator;
	global ConnectApi.FilterOperatorDataType type;
	global List<String> value;
	global AttributeFilterInput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}