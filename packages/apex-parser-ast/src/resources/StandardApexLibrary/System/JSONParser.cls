/**
 * Represents a parser for JSON-encoded content.
 */
global class JSONParser {

  global JSONParser() {}

  /**
   * Removes the current token.
   */
  global void clearCurrentToken() {}

  /**
   * Returns the current token as a BLOB value.
   * @return Blob
   */
  global Blob getBlobValue() {}

  /**
   * Returns the current token as a Boolean value.
   * @return Boolean
   */
  global Boolean getBooleanValue() {}

  /**
   * Returns the name associated with the current token.
   * @return String
   */
  global String getCurrentName() {}

  /**
   * Returns the token that the parser currently points to or null if there's no current token.
   * @return System.JSONToken
   */
  global System.JSONToken getCurrentToken() {}

  /**
   * Returns the current token as a date and time value.
   * @return Datetime
   */
  global Datetime getDatetimeValue() {}

  /**
   * Returns the current token as a date value.
   * @return Date
   */
  global Date getDateValue() {}

  /**
   * Returns the current token as a decimal value.
   * @return Decimal
   */
  global Decimal getDecimalValue() {}

  /**
   * Returns the current token as a double value.
   * @return Double
   */
  global Double getDoubleValue() {}

  /**
   * Returns the current token as an ID value.
   * @return ID
   */
  global ID getIdValue() {}

  /**
   * Returns the current token as an integer value.
   * @return Integer
   */
  global Integer getIntegerValue() {}

  /**
   * Returns the last token that was cleared by the clearCurrentToken method.
   * @return System.JSONToken
   */
  global System.JSONToken getLastClearedToken() {}

  /**
   * Returns the current token as a long value.
   * @return Long
   */
  global Long getLongValue() {}

  /**
   * Returns the textual representation of the current token or null if there's no current token.
   * @return String
   */
  global String getText() {}

  /**
   * Returns the current token as a time value.
   * @return Time
   */
  global Time getTimeValue() {}

  /**
   * Returns true if the parser currently points to a token; otherwise, returns false .
   * @return Boolean
   */
  global Boolean hasCurrentToken() {}

  /**
   * Returns the next token or null if the parser has reached the end of the input stream.
   * @return System.JSONToken
   */
  global System.JSONToken nextToken() {}

  /**
   * Returns the next token that is a value type or null if the parser has reached the end of the input stream.
   * @return System.JSONToken
   */
  global System.JSONToken nextValue() {}

  /**
   * Deserializes JSON content into an object of the specified Apex type and returns the deserialized object.
   * @param apexType The apexType argument specifies the type of the object that this method returns after deserializing the current value.
   * @return Object
   */
  global Object readValueAs(System.Type apexType) {}

  /**
   * Deserializes JSON content into an object of the specified Apex type and returns the deserialized object. All attributes in the JSON content must be present in the specified type.
   * @param apexType The apexType argument specifies the type of the object that this method returns after deserializing the current value.
   * @return Object
   */
  global Object readValueAsStrict(System.Type apexType) {}

  /**
   * Skips all child tokens of type JSONToken.START_ARRAY and JSONToken.START_OBJECT that the parser currently points to.
   */
  global void skipChildren() {}

  global Object clone() {}

}