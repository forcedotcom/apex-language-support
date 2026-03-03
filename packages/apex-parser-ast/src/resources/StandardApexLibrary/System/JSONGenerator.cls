/**
 * Contains methods used to serialize objects into JSON content using the standard JSON encoding.
 */
global class JSONGenerator {

  /**
   * Closes the JSON generator.
   */
  public void close() {}

  /**
   * Returns the generated JSON content.
   * @return String
   */
  public String getAsString() {}

  /**
   * Returns true if the JSON generator is closed; otherwise, returns false .
   * @return Boolean
   */
  public Boolean isClosed() {}

  /**
   * Writes the specified Blob value as a base64-encoded string.
   * @param blobValue 
   */
  public void writeBlob(Blob blobValue) {}

  /**
   * Writes a field name and value pair using the specified field name and BLOB value.
   * @param fieldName 
   * @param blobValue 
   */
  public void writeBlobField(String fieldName, Blob blobValue) {}

  /**
   * Writes the specified Boolean value.
   * @param blobValue 
   */
  public void writeBoolean(Boolean blobValue) {}

  /**
   * Writes a field name and value pair using the specified field name and Boolean value.
   * @param fieldName 
   * @param booleanValue 
   */
  public void writeBooleanField(String fieldName, Boolean booleanValue) {}

  /**
   * Writes the specified date value in the ISO-8601 format.
   * @param dateValue 
   */
  public void writeDate(Date dateValue) {}

  /**
   * Writes a field name and value pair using the specified field name and date value. The date value is written in the ISO-8601 format.
   * @param fieldName 
   * @param dateValue 
   */
  public void writeDateField(String fieldName, Date dateValue) {}

  /**
   * Writes the specified date and time value in the ISO-8601 format.
   * @param datetimeValue 
   */
  public void writeDateTime(Datetime datetimeValue) {}

  /**
   * Writes a field name and value pair using the specified field name and date and time value. The date and time value is written in the ISO-8601 format.
   * @param fieldName 
   * @param datetimeValue 
   */
  public void writeDateTimeField(String fieldName, Datetime datetimeValue) {}

  /**
   * Writes the ending marker of a JSON array (']').
   */
  public void writeEndArray() {}

  /**
   * Writes the ending marker of a JSON object ('}').
   */
  public void writeEndObject() {}

  /**
   * Writes a field name.
   * @param fieldName 
   */
  public void writeFieldName(String fieldName) {}

  /**
   * Writes the specified ID value.
   * @param identifier 
   */
  public void writeId(ID identifier) {}

  /**
   * Writes a field name and value pair using the specified field name and identifier value.
   * @param fieldName 
   * @param identifier 
   */
  public void writeIdField(String fieldName, Id identifier) {}

  /**
   * Writes the JSON null literal value.
   */
  public void writeNull() {}

  /**
   * Writes a field name and value pair using the specified field name and the JSON null literal value.
   * @param fieldName 
   */
  public void writeNullField(String fieldName) {}

  /**
   * Writes the specified decimal value.
   * @param number 
   */
  public void writeNumber(Decimal number) {}

  /**
   * Writes the specified decimal value.
   * @param number 
   */
  public void writeNumber(Double number) {}

  /**
   * Writes the specified decimal value.
   * @param number 
   */
  public void writeNumber(Integer number) {}

  /**
   * Writes the specified decimal value.
   * @param number 
   */
  public void writeNumber(Long number) {}

  /**
   * Writes a field name and value pair using the specified field name and decimal value.
   * @param fieldName 
   * @param number 
   */
  public void writeNumberField(String fieldName, Decimal number) {}

  /**
   * Writes a field name and value pair using the specified field name and decimal value.
   * @param fieldName 
   * @param number 
   */
  public void writeNumberField(String fieldName, Double number) {}

  /**
   * Writes a field name and value pair using the specified field name and decimal value.
   * @param fieldName 
   * @param number 
   */
  public void writeNumberField(String fieldName, Integer number) {}

  /**
   * Writes a field name and value pair using the specified field name and decimal value.
   * @param fieldName 
   * @param number 
   */
  public void writeNumberField(String fieldName, Long number) {}

  /**
   * Writes the specified Apex object in JSON format.
   * @param anyObject 
   */
  public void writeObject(Object anyObject) {}

  /**
   * Writes a field name and value pair using the specified field name and Apex object.
   * @param fieldName 
   * @param value 
   */
  public void writeObjectField(String fieldName, Object value) {}

  /**
   * Writes the starting marker of a JSON array ('[').
   */
  public void writeStartArray() {}

  /**
   * Writes the starting marker of a JSON object ('{').
   */
  public void writeStartObject() {}

  /**
   * Writes the specified string value.
   * @param stringValue 
   */
  public void writeString(String stringValue) {}

  /**
   * Writes a field name and value pair using the specified field name and string value.
   * @param fieldName 
   * @param stringValue 
   */
  public void writeStringField(String fieldName, String stringValue) {}

  /**
   * Writes the specified time value in the ISO-8601 format.
   * @param timeValue 
   */
  public void writeTime(Time timeValue) {}

  /**
   * Writes a field name and value pair using the specified field name and time value in the ISO-8601 format.
   * @param fieldName 
   * @param timeValue 
   */
  public void writeTimeField(String fieldName, Time timeValue) {}

}