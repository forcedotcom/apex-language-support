/**
 * Contains methods used to serialize objects into JSON content using the standard JSON encoding.
 * Usage
 * The System.JSONGenerator class is provided to enable the generation of standard JSON-encoded content and gives you more control on the structure of the JSON output.
 */
global class JSONGenerator {
    /**
     * Closes the JSON generator.
     * Usage
     * No more content can be written after the JSON generator is closed.
     */
    global void close() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the generated JSON content.
     * Usage
     * This method closes the JSON generator if it isn't closed already.
     */
    global String getAsString() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns true if the JSON generator is closed; otherwise, returns false.
     */
    global Boolean isClosed() { return false; }

    global override virtual String toString() { return null; }

    /**
     * Writes the specified Blob value as a base64-encoded string.
     */
    global void writeBlob(Blob b) { }

    /**
     * Writes a field name and value pair using the specified field name and BLOB value.
     */
    global void writeBlobField(String fieldName, Blob b) { }

    /**
     * Writes the specified Boolean value.
     */
    global void writeBoolean(Boolean b) { }

    /**
     * Writes a field name and value pair using the specified field name and Boolean value.
     */
    global void writeBooleanField(String fieldName, Boolean b) { }

    /**
     * Writes the specified date value in the ISO-8601 format.
     */
    global void writeDate(Date d) { }

    /**
     * Writes a field name and value pair using the specified field name and date value. The date value is written in the ISO-8601 format.
     */
    global void writeDateField(String fieldName, Date d) { }

    /**
     * Writes the specified date and time value in the ISO-8601 format.
     */
    global void writeDateTime(Datetime dt) { }

    /**
     * Writes a field name and value pair using the specified field name and date and time value. The date and time value is written in the ISO-8601 format.
     */
    global void writeDateTimeField(String fieldName, Datetime dt) { }

    /**
     * Writes the ending marker of a JSON array (']').
     */
    global void writeEndArray() { }

    /**
     * Writes the ending marker of a JSON object ('}').
     */
    global void writeEndObject() { }

    /**
     * Writes a field name.
     */
    global void writeFieldName(String fieldName) { }

    /**
     * Writes the specified ID value.
     */
    global void writeId(Id id) { }

    /**
     * Writes a field name and value pair using the specified field name and identifier value.
     */
    global void writeIdField(String fieldName, Id id) { }

    /**
     * Writes the JSON null literal value.
     */
    global void writeNull() { }

    /**
     * Writes a field name and value pair using the specified field name and the JSON null literal value.
     */
    global void writeNullField(String fieldName) { }

    /**
     * Writes the specified decimal value.
     */
    global void writeNumber(Decimal d) { }

    /**
     * Writes the specified double value.
     */
    global void writeNumber(Double d) { }

    /**
     * Writes the specified integer value.
     */
    global void writeNumber(Integer i) { }

    /**
     * Writes the specified long value.
     */
    global void writeNumber(Long lng) { }

    /**
     * Writes a field name and value pair using the specified field name and decimal value.
     */
    global void writeNumberField(String fieldName, Decimal d) { }

    /**
     * Writes a field name and value pair using the specified field name and double value.
     */
    global void writeNumberField(String fieldName, Double d) { }

    /**
     * Writes a field name and value pair using the specified field name and integer value.
     */
    global void writeNumberField(String fieldName, Integer i) { }

    /**
     * Writes a field name and value pair using the specified field name and long value.
     */
    global void writeNumberField(String fieldName, Long lng) { }

    /**
     * Writes the specified Apex object in JSON format.
     */
    global void writeObject(Object o) { }

    /**
     * Writes a field name and value pair using the specified field name and Apex object.
     */
    global void writeObjectField(String fieldName, Object o) { }

    /**
     * Writes the starting marker of a JSON array ('[').
     */
    global void writeStartArray() { }

    /**
     * Writes the starting marker of a JSON object ('{').
     */
    global void writeStartObject() { }

    /**
     * Writes the specified string value.
     */
    global void writeString(String str) { }

    /**
     * Writes a field name and value pair using the specified field name and string value.
     */
    global void writeStringField(String fieldName, String str) { }

    /**
     * Writes the specified time value in the ISO-8601 format.
     */
    global void writeTime(Time t) { }

    /**
     * Writes a field name and value pair using the specified field name and time value in the ISO-8601 format.
     */
    global void writeTimeField(String fieldName, Time t) { }
}