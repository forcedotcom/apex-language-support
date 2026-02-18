global class EventSessionRepresentation {
	global Map<String,String> additionalFields;
	global String createdById;
	global Datetime createdDate;
	global Datetime endDateTime;
	global String id;
	global String lastModifiedById;
	global Datetime lastModifiedDate;
	global ConnectApi.LocationRepresentation location;
	global String locationId;
	global String mngEventId;
	global String mode;
	global String name;
	global Datetime startDateTime;
	global EventSessionRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}