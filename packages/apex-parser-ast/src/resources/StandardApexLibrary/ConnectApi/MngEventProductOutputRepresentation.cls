global class MngEventProductOutputRepresentation {
	global Map<String,String> additionalFields;
	global String createdById;
	global String createdDate;
	global String lastModifiedById;
	global String lastModifiedDate;
	global String managedEventId;
	global String managedEventProductId;
	global String name;
	global ConnectApi.EventProductRepresentation product;
	global String productReferenceRecordId;
	global MngEventProductOutputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}