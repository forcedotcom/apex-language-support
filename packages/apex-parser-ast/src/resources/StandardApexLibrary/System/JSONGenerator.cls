/**
 * Contains methods used to serialize objects into JSON content using the standard JSON encoding.
 */
public class JSONGenerator {

  /**
   * Closes the JSON generator.
   * @return Void
   */
  public Void close() {}

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
   * @return Void
   */
  public Void writeBlob(Blob blobValue) {}

  /**
   * Writes a field name and value pair using the specified field name and BLOB value.
   * @param fieldName 
   * @param blobValue 
   * @return Void
   */
  public Void writeBlobField(String fieldName, Blob blobValue) {}

  /**
   * Writes the specified Boolean value.
   * @param blobValue 
   * @return Void
   */
  public Void writeBoolean(Boolean blobValue) {}

  /**
   * Writes a field name and value pair using the specified field name and Boolean value.
   * @param fieldName 
   * @param booleanValue 
   * @return Void
   */
  public Void writeBooleanField(String fieldName, Boolean booleanValue) {}

  /**
   * Writes the specified date value in the ISO-8601 format.
   * @param dateValue 
   * @return Void
   */
  public Void writeDate(Date dateValue) {}

  /**
   * Writes a field name and value pair using the specified field name and date value. The date value is written in the ISO-8601 format.
   * @param fieldName 
   * @param dateValue 
   * @return Void
   */
  public Void writeDateField(String fieldName, Date dateValue) {}

  /**
   * Writes the specified date and time value in the ISO-8601 format.
   * @param datetimeValue 
   * @return Void
   */
  public Void writeDateTime(Datetime datetimeValue) {}

  /**
   * Writes a field name and value pair using the specified field name and date and time value. The date and time value is written in the ISO-8601 format.
   * @param fieldName 
   * @param datetimeValue 
   * @return Void
   */
  public Void writeDateTimeField(String fieldName, Datetime datetimeValue) {}

  /**
   * Writes the ending marker of a JSON array (']').
   * @return Void
   */
  public Void writeEndArray() {}

  /**
   * Writes the ending marker of a JSON object ('}').
   * @return Void
   */
  public Void writeEndObject() {}

  /**
   * Writes a field name.
   * @param fieldName 
   * @return Void
   */
  public Void writeFieldName(String fieldName) {}

  /**
   * Writes the specified ID value.
   * @param identifier 
   * @return Void
   */
  public Void writeId(ID identifier) {}

  /**
   * Writes a field name and value pair using the specified field name and identifier value.
   * @param fieldName 
   * @param identifier 
   * @return Void
   */
  public Void writeIdField(String fieldName, Id identifier) {}

  /**
   * Writes the JSON null literal value.
   * @return Void
   */
  public Void writeNull() {}

  /**
   * Writes a field name and value pair using the specified field name and the JSON null literal value.
   * @param fieldName 
   * @return Void
   */
  public Void writeNullField(String fieldName) {}

  /**
   * Writes the specified decimal value.
   * @param number 
   * @return Void
   */
  public Void writeNumber(Decimal number) {}

  /**
   * Writes the specified decimal value.
   * @param number 
   * @return Void
   */
  public Void writeNumber(Double number) {}

  /**
   * Writes the specified decimal value.
   * @param number 
   * @return Void
   */
  public Void writeNumber(Integer number) {}

  /**
   * Writes the specified decimal value.
   * @param number 
   * @return Void
   */
  public Void writeNumber(Long number) {}

  /**
   * Writes a field name and value pair using the specified field name and decimal value.
   * @param fieldName 
   * @param number 
   * @return Void
   */
  public Void writeNumberField(String fieldName, Decimal number) {}

  /**
   * Writes a field name and value pair using the specified field name and decimal value.
   * @param fieldName 
   * @param number 
   * @return Void
   */
  public Void writeNumberField(String fieldName, Double number) {}

  /**
   * Writes a field name and value pair using the specified field name and decimal value.
   * @param fieldName 
   * @param number 
   * @return Void
   */
  public Void writeNumberField(String fieldName, Integer number) {}

  /**
   * Writes a field name and value pair using the specified field name and decimal value.
   * @param fieldName 
   * @param number 
   * @return Void
   */
  public Void writeNumberField(String fieldName, Long number) {}

  /**
   * Writes the specified Apex object in JSON format.
   * @param anyObject 
   * @return Void
   */
  public Void writeObject(Object anyObject) {}

  /**
   * Writes a field name and value pair using the specified field name and Apex object.
   * @param fieldName 
   * @param value 
   * @return Void
   */
  public Void writeObjectField(String fieldName, Object value) {}

  /**
   * Writes the starting marker of a JSON array ('[').
   * @return Void
   */
  public Void writeStartArray() {}

  /**
   * Writes the starting marker of a JSON object ('{').
   * @return Void
   */
  public Void writeStartObject() {}

  /**
   * Writes the specified string value.
   * @param stringValue 
   * @return Void
   */
  public Void writeString(String stringValue) {}

  /**
   * Writes a field name and value pair using the specified field name and string value.
   * @param fieldName 
   * @param stringValue 
   * @return Void
   */
  public Void writeStringField(String fieldName, String stringValue) {}

  /**
   * Writes the specified time value in the ISO-8601 format.
   * @param timeValue 
   * @return Void
   */
  public Void writeTime(Time timeValue) {}

  /**
   * Writes a field name and value pair using the specified field name and time value in the ISO-8601 format.
   * @param fieldName 
   * @param timeValue 
   * @return Void
   */
  public Void writeTimeField(String fieldName, Time timeValue) {}

}