global class DataModelObject {
	global ConnectApi.DataObjectCategoryEnum category;
	global ConnectApi.DataModelObjectCreationType creationType;
	global Map<String,String> dataLakeObjectsInError;
	global String dataSpaceName;
	global String description;
	global ConnectApi.DmoAggregatedStatus dmoStatus;
	global String externalDataModelObjectErrorCode;
	global ConnectApi.ExternalObjectStatus externalObjectStatus;
	global List<ConnectApi.DataModelField> fields;
	global Boolean hasExternalDataLakeObjectMappings;
	global Boolean isDeletable;
	global Boolean isEditable;
	global Boolean isEnabled;
	global Boolean isSegmentable;
	global String sourceOrgName;
	global DataModelObject() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}