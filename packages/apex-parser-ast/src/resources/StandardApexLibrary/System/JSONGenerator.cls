/**
 * Contains methods used to serialize objects into JSON content using the standard JSON encoding.
 */
global class JSONGenerator {

  global JSONGenerator() {}

  /**
   * Closes the JSON generator.
   */
  global void close() {}

  /**
   * Returns the generated JSON content.
   * @return String
   */
  global String getAsString() {}

  /**
   * Returns true if the JSON generator is closed; otherwise, returns false .
   * @return Boolean
   */
  global Boolean isClosed() {}

  /**
   * Writes the specified Blob value as a base64-encoded string.
   * @param blobValue 
   */
  global void writeBlob(Blob blobValue) {}

  /**
   * Writes a field name and value pair using the specified field name and BLOB value.
   * @param fieldName 
   * @param blobValue 
   */
  global void writeBlobField(String fieldName, Blob blobValue) {}

  /**
   * Writes the specified Boolean value.
   * @param blobValue 
   */
  global void writeBoolean(Boolean blobValue) {}

  /**
   * Writes a field name and value pair using the specified field name and Boolean value.
   * @param fieldName 
   * @param booleanValue 
   */
  global void writeBooleanField(String fieldName, Boolean booleanValue) {}

  /**
   * Writes the specified date value in the ISO-8601 format.
   * @param dateValue 
   */
  global void writeDate(Date dateValue) {}

  /**
   * Writes a field name and value pair using the specified field name and date value. The date value is written in the ISO-8601 format.
   * @param fieldName 
   * @param dateValue 
   */
  global void writeDateField(String fieldName, Date dateValue) {}

  /**
   * Writes the specified date and time value in the ISO-8601 format.
   * @param datetimeValue 
   */
  global void writeDateTime(Datetime datetimeValue) {}

  /**
   * Writes a field name and value pair using the specified field name and date and time value. The date and time value is written in the ISO-8601 format.
   * @param fieldName 
   * @param datetimeValue 
   */
  global void writeDateTimeField(String fieldName, Datetime datetimeValue) {}

  /**
   * Writes the ending marker of a JSON array (']').
   */
  global void writeEndArray() {}

  /**
   * Writes the ending marker of a JSON object ('}').
   */
  global void writeEndObject() {}

  /**
   * Writes a field name.
   * @param fieldName 
   */
  global void writeFieldName(String fieldName) {}

  /**
   * Writes the specified ID value.
   * @param identifier 
   */
  global void writeId(ID identifier) {}

  /**
   * Writes a field name and value pair using the specified field name and identifier value.
   * @param fieldName 
   * @param identifier 
   */
  global void writeIdField(String fieldName, Id identifier) {}

  /**
   * Writes the JSON null literal value.
   */
  global void writeNull() {}

  /**
   * Writes a field name and value pair using the specified field name and the JSON null literal value.
   * @param fieldName 
   */
  global void writeNullField(String fieldName) {}

  /**
   * Writes the specified decimal value.
   * @param number 
   */
  global void writeNumber(Decimal number) {}

  /**
   * Writes the specified decimal value.
   * @param number 
   */
  global void writeNumber(Double number) {}

  /**
   * Writes the specified decimal value.
   * @param number 
   */
  global void writeNumber(Integer number) {}

  /**
   * Writes the specified decimal value.
   * @param number 
   */
  global void writeNumber(Long number) {}

  /**
   * Writes a field name and value pair using the specified field name and decimal value.
   * @param fieldName 
   * @param number 
   */
  global void writeNumberField(String fieldName, Decimal number) {}

  /**
   * Writes a field name and value pair using the specified field name and decimal value.
   * @param fieldName 
   * @param number 
   */
  global void writeNumberField(String fieldName, Double number) {}

  /**
   * Writes a field name and value pair using the specified field name and decimal value.
   * @param fieldName 
   * @param number 
   */
  global void writeNumberField(String fieldName, Integer number) {}

  /**
   * Writes a field name and value pair using the specified field name and decimal value.
   * @param fieldName 
   * @param number 
   */
  global void writeNumberField(String fieldName, Long number) {}

  /**
   * Writes the specified Apex object in JSON format.
   * @param anyObject 
   */
  global void writeObject(Object anyObject) {}

  /**
   * Writes a field name and value pair using the specified field name and Apex object.
   * @param fieldName 
   * @param value 
   */
  global void writeObjectField(String fieldName, Object value) {}

  /**
   * Writes the starting marker of a JSON array ('[').
   */
  global void writeStartArray() {}

  /**
   * Writes the starting marker of a JSON object ('{').
   */
  global void writeStartObject() {}

  /**
   * Writes the specified string value.
   * @param stringValue 
   */
  global void writeString(String stringValue) {}

  /**
   * Writes a field name and value pair using the specified field name and string value.
   * @param fieldName 
   * @param stringValue 
   */
  global void writeStringField(String fieldName, String stringValue) {}

  /**
   * Writes the specified time value in the ISO-8601 format.
   * @param timeValue 
   */
  global void writeTime(Time timeValue) {}

  /**
   * Writes a field name and value pair using the specified field name and time value in the ISO-8601 format.
   * @param fieldName 
   * @param timeValue 
   */
  global void writeTimeField(String fieldName, Time timeValue) {}

  global Object clone() {}

}