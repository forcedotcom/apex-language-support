/**
 * Contains properties and a method to create a serializable representation of a record and its associated data for AI service integration and data processing.
 */
global class RecordApexRepresentation {

  public RecordApexRepresentation(String objectType, List<embeddedai.ApexMap> recordData, List<embeddedai.RecordApexRepresentation> relatedRecordData) {}

  public String objectType;

  public List<embeddedai.ApexMap> recordData;

  public List<embeddedai.RecordApexRepresentation> relatedRecordData;

  public static embeddedai.RecordApexRepresentation toRecordApexRep(String jsonString) {}

  public String toString() {}

  global Object clone() {}

}