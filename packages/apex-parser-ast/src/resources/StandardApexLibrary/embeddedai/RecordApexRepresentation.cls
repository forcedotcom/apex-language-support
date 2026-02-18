global class RecordApexRepresentation {
	global String objectType;
	global List<embeddedai.ApexMap> recordData;
	global List<embeddedai.RecordApexRepresentation> relatedRecordData;
	global RecordApexRepresentation(String objectType, List<embeddedai.ApexMap> recordData, List<embeddedai.RecordApexRepresentation> relatedRecordData) { }
	global RecordApexRepresentation() { }
	global Object clone() { }
	global static embeddedai.RecordApexRepresentation toRecordApexRep(String jsonString) { }
	global String toString() { }

}