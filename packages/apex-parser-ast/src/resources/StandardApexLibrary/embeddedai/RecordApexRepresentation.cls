/**
 * Contains properties and a method to create a serializable representation of a record and its associated data for AI service integration and data processing.
 */
global with sharing class RecordApexRepresentation {
    /**
     * Stores the type of the object.
     * <p>String
     */
    @AuraEnabled
    global String objectType { get; set; }
    /**
     * Stores a list of objects, where each object holds a key-value pair.
     * <p>List<embeddedai.ApexMap>
     */
    @AuraEnabled
    global List recordData { get; set; }
    /**
     * Stores a list that contains a child or related records associated with the record data.
     * <p>List<embeddedai.RecordApexRepresentation>
     */
    @AuraEnabled
    global List relatedRecordData { get; set; }

    /**
     * Initializes the RecordApexRepresentation class.
     */
    global Object RecordApexRepresentation() { return null; }

    /**
     * Initializes a new instance of the RecordApexRepresentation class with the specified object type, primary record data, and related record data. This constructor represents a structured record and its relationships for consumption by embedded AI logic.
     */
    global Object RecordApexRepresentation(String objectType, List recordData, List relatedRecordData) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a JSON-formatted string into a RecordApexRepresentation instance. This method parses the provided JSON and constructs a structured record representation that can be used by embedded AI logic.
     * @return Returns a RecordApexRepresentation instance populated with the data parsed from the provided JSON string.
     */
    global static embeddedai.RecordApexRepresentation toRecordApexRep(String jsonString) { return null; }

    /**
     * Returns a structured JSON string representation of the RecordApexRepresentation object and its nested related records.
     */
    global override String toString() { return null; }
}