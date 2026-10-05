/**
 * Create, clone, and convert string based key-value pairs to a JSON string format.
 */
global with sharing class ApexMap {
    /**
     * Represents key of the key-value pair. This property is used to store the unique ID or name of the data.
     * <p>String
     */
    @AuraEnabled
    global String key { get; set; }
    /**
     * Represents value of the key-value pair. This property is used to store the data associated with the key.
     * <p>String
     */
    @AuraEnabled
    global String value { get; set; }

    /**
     * Initializes the ApexMap class.
     */
    global ApexMap() { }

    /**
     * Initializes a new instance of the ApexMap class by assigning the specified key and value. This constructor creates a single key–value entry that can be included in an embedded AI Apex map for passing contextual data to embedded AI logic.
     */
    global ApexMap(String key, String value) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns a string representation of the ApexMap object.
     */
    global override String toString() { return null; }
}