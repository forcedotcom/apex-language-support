/**
 * Contains properties and a method to create a serializable representation of a record and its associated data for AI service integration and data processing.
 */
global class RecordApexRepresentation {

  global RecordApexRepresentation(String objectType, List<embeddedai.ApexMap> recordData, List<embeddedai.RecordApexRepresentation> relatedRecordData) {}

  global String objectType;

  global List<embeddedai.ApexMap> recordData;

  global List<embeddedai.RecordApexRepresentation> relatedRecordData;

  global static embeddedai.RecordApexRepresentation toRecordApexRep(String jsonString) {}

  global String toString() {}

  global Object clone() {}

}