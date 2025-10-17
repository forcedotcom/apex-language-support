global class DataLakeObject {
	global Map<String,Boolean> capabilities;
	global ConnectApi.DataLakeObjectCategoryEnum category;
	global List<ConnectApi.DataLakeField> dataLakeFieldInfoRepresentation;
	global ConnectApi.DataLakeDataSource dataSource;
	global List<ConnectApi.DataSpace> dataSpaceInfo;
	global String eventDateTimeFieldName;
	global List<ConnectApi.DataLakeField> fields;
	global String orgUnitIdentifierFieldName;
	global String recordModifiedFieldName;
	global ConnectApi.DataLakeObjectStatusEnum status;
	global Integer timeToLive;
	global String timeToLiveFieldName;
	global DataLakeObject() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}