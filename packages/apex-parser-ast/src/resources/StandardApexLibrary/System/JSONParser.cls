/**
 * Represents a parser for JSON-encoded content.
 * <p>Usage
 * Use the System.JSONParser methods to parse a response that's returned from a call to an external service that is in JSON format, such as a JSON-encoded response of a Web service callout.
 */
global class JSONParser {
    /**
     * Removes the current token.
     * <p>Usage
     * After this method is called, a call to hasCurrentToken returns false and a call to getCurrentToken returns null. You can retrieve the cleared token by calling getLastClearedToken.
     */
    global void clearCurrentToken() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the current token as a BLOB value.
     * <p>Usage
     * The current token must be of type JSONToken.VALUE_STRING and must be Base64-encoded.
     */
    global Blob getBlobValue() { return null; }

    /**
     * Returns the current token as a Boolean value.
     * <p>Usage
     * The current token must be of type JSONToken.VALUE_TRUE or JSONToken.VALUE_FALSE.
     * The following example parses a sample JSON string and retrieves a Boolean value.
     * String JSONContent =
     *     '{"isActive":true}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Advance to the start object marker.
     * parser.nextToken();
     * // Advance to the next value.
     * parser.nextValue();
     * // Get the Boolean value.
     * Boolean isActive = parser.getBooleanValue();
     */
    global Boolean getBooleanValue() { return false; }

    /**
     * Returns the name associated with the current token.
     * <p>Usage
     * If the current token is of type JSONToken.FIELD_NAME, this method returns the same value as getText. If the current token is a value, this method returns the field name that precedes this token. For other values such as array values or root-level values, this method returns null.
     * The following example parses a sample JSON string. It advances to the field value and retrieves its corresponding field name.
     * <p>Example
     * String JSONContent = '{"firstName":"John"}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Advance to the start object marker.
     * parser.nextToken();
     * // Advance to the next value.
     * parser.nextValue();
     * // Get the field name for the current value.
     * String fieldName = parser.getCurrentName();
     * // Get the textual representation
     * // of the value.
     * String fieldValue = parser.getText();
     */
    global String getCurrentName() { return null; }

    /**
     * Returns the token that the parser currently points to or null if there's no current token.
     * <p>Usage
     * The following example iterates through all the tokens in a sample JSON string.
     * String JSONContent = '{"firstName":"John"}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Advance to the next token.
     * while (parser.nextToken() != null) {
     *     System.debug('Current token: ' +
     *         parser.getCurrentToken());
     * }
     */
    global System.JSONToken getCurrentToken() { return null; }

    /**
     * Returns the current token as a date and time value.
     * <p>Usage
     * The current token must be of type JSONToken.VALUE_STRING and must represent a Datetime value in the ISO-8601 format.
     * The following example parses a sample JSON string and retrieves a Datetime value.
     * String JSONContent =
     * '{"transactionDate":"2011-03-22T13:01:23"}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Advance to the start object marker.
     * parser.nextToken();
     * // Advance to the next value.
     * parser.nextValue();
     * // Get the transaction date.
     * Datetime transactionDate =
     *    parser.getDatetimeValue();
     */
    global Datetime getDateTimeValue() { return null; }

    /**
     * Returns the current token as a date value.
     * <p>Usage
     * The current token must be of type JSONToken.VALUE_STRING and must represent a Date value in the ISO-8601 format.
     * The following example parses a sample JSON string and retrieves a Date value.
     * String JSONContent =
     *    '{"dateOfBirth":"2011-03-22"}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Advance to the start object marker.
     * parser.nextToken();
     * // Advance to the next value.
     * parser.nextValue();
     * // Get the date of birth.
     * Date dob = parser.getDateValue();
     */
    global Date getDateValue() { return null; }

    /**
     * Returns the current token as a decimal value.
     * <p>Usage
     * The current token must be of type JSONToken.VALUE_NUMBER_FLOAT or JSONToken.VALUE_NUMBER_INT and is a numerical value that can be converted to a value of type Decimal.
     * The following example parses a sample JSON string and retrieves a Decimal value.
     * String JSONContent =
     *    '{"GPA":3.8}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Advance to the start object marker.
     * parser.nextToken();
     * // Advance to the next value.
     * parser.nextValue();
     * // Get the GPA score.
     * Decimal gpa = parser.getDecimalValue();
     */
    global Decimal getDecimalValue() { return 0.0; }

    /**
     * Returns the current token as a double value.
     * <p>Usage
     * The current token must be of type JSONToken.VALUE_NUMBER_FLOAT and is a numerical value that can be converted to a value of type Double.
     * The following example parses a sample JSON string and retrieves a Double value.
     * String JSONContent =
     *    '{"GPA":3.8}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Advance to the start object marker.
     * parser.nextToken();
     * // Advance to the next value.
     * parser.nextValue();
     * // Get the GPA score.
     * Double gpa = parser.getDoubleValue();
     */
    global Double getDoubleValue() { return 0.0; }

    /**
     * Returns the current token as an ID value.
     * <p>Usage
     * The current token must be of type JSONToken.VALUE_STRING and must be a valid ID.
     * The following example parses a sample JSON string and retrieves an ID value.
     * String JSONContent =
     *    '{"recordId":"001R0000002nO6H"}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Advance to the start object marker.
     * parser.nextToken();
     * // Advance to the next value.
     * parser.nextValue();
     * // Get the record ID.
     * ID recordID = parser.getIdValue();
     */
    global Id getIdValue() { return null; }

    /**
     * Returns the current token as an integer value.
     * <p>Usage
     * The current token must be of type JSONToken.VALUE_NUMBER_INT and must represent an Integer.
     * The following example parses a sample JSON string and retrieves an Integer value.
     * String JSONContent =
     *    '{"recordCount":10}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Advance to the start object marker.
     * parser.nextToken();
     * // Advance to the next value.
     * parser.nextValue();
     * // Get the record count.
     * Integer count = parser.getIntegerValue();
     */
    global Integer getIntegerValue() { return 0; }

    /**
     * Returns the last token that was cleared by the clearCurrentToken method.
     */
    global System.JSONToken getLastClearedToken() { return null; }

    /**
     * Returns the current token as a long value.
     * <p>Usage
     * The current token must be of type JSONToken.VALUE_NUMBER_INT and is a numerical value that can be converted to a value of type Long .
     * The following example parses a sample JSON string and retrieves a Long value.
     * String JSONContent =
     *    '{"recordCount":2097531021}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Advance to the start object marker.
     * parser.nextToken();
     * // Advance to the next value.
     * parser.nextValue();
     * // Get the record count.
     * Long count = parser.getLongValue();
     */
    global Long getLongValue() { return 0L; }

    /**
     * Returns the textual representation of the current token or null if there's no current token.
     * <p>Usage
     * No current token exists, and therefore this method returns null, if nextToken has not been called yet for the first time or if the parser has reached the end of the input stream.
     */
    global String getText() { return null; }

    /**
     * Returns the current token as a time value.
     * <p>Usage
     * The current token must be of type JSONToken.VALUE_STRING and must represent a Time value in the ISO-8601 format.
     * The following example parses a sample JSON string and retrieves a Datetime value.
     * String JSONContent =
     *    '{"arrivalTime":"18:05"}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Advance to the start object marker.
     * parser.nextToken();
     * // Advance to the next value.
     * parser.nextValue();
     * // Get the arrival time.
     * Time arrivalTime = parser.getTimeValue();
     */
    global Time getTimeValue() { return null; }

    /**
     * Returns true if the parser currently points to a token; otherwise, returns false.
     */
    global Boolean hasCurrentToken() { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns the next token or null if the parser has reached the end of the input stream.
     * <p>Usage
     * Advances the stream enough to determine the type of the next token, if any.
     */
    global System.JSONToken nextToken() { return null; }

    /**
     * Returns the next token that is a value type or null if the parser has reached the end of the input stream.
     * <p>Usage
     * Advances the stream enough to determine the type of the next token that is of a value type, if any, including a JSON array and object start and end markers.
     */
    global System.JSONToken nextValue() { return null; }

    /**
     * Deserializes JSON content into an object of the specified Apex type and returns the deserialized object.
     * <p>Usage
     * If the JSON content contains attributes not present in the System.Type argument, such as a missing field or object, deserialization fails in some circumstances. When deserializing JSON content into a custom object or an sObject using Salesforce API version 34.0 or earlier, this method throws a runtime exception when passed extraneous attributes. When deserializing JSON content into an Apex class in any API version, or into an object in API version 35.0 or later, no exception is thrown. When no exception is thrown, this method ignores extraneous attributes and parses the rest of the JSON content.
     * <p>Example
     * The following example parses a sample JSON string and retrieves a Datetime value. Before being able to run this sample, you must create a new Apex class as follows:
     * public class Person {
     *     public String name;
     *     public String phone;
     * }
     *
     * Next, insert the following sample in a class method:
     * // JSON string that contains a Person object.
     * String JSONContent =
     *     '{"person":{' +
     *         '"name":"John Smith",' +
     *         '"phone":"555-1212"}}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Make calls to nextToken()
     * // to point to the second
     * // start object marker.
     * parser.nextToken();
     * parser.nextToken();
     * parser.nextToken();
     * // Retrieve the Person object
     * // from the JSON string.
     * Person obj =
     *    (Person)parser.readValueAs(
     *       Person.class);
     * System.assertEquals(
     *    obj.name, 'John Smith');
     * System.assertEquals(
     *    obj.phone, '555-1212');
     */
    global Object readValueAs(System.Type apexType) { return null; }

    /**
     * Deserializes JSON content into an object of the specified Apex type and returns the deserialized object. All attributes in the JSON content must be present in the specified type.
     * <p>Usage
     * If the JSON content contains attributes not present in the System.Type argument, such as a missing field or object, deserialization fails in some circumstances. When deserializing JSON content with extraneous attributes into an Apex class, this method throws an exception in all API versions. However, no exception is thrown when you use this method to deserialize JSON content into a custom object or an sObject.
     * The following example parses a sample JSON string and retrieves a Datetime value. Before being able to run this sample, you must create a new Apex class as follows:
     * public class Person {
     *     public String name;
     *     public String phone;
     * }
     *
     * Next, insert the following sample in a class method:
     * // JSON string that contains a Person object.
     * String JSONContent =
     *     '{"person":{' +
     *         '"name":"John Smith",' +
     *         '"phone":"555-1212"}}';
     * JSONParser parser =
     *    JSON.createParser(JSONContent);
     * // Make calls to nextToken()
     * // to point to the second
     * // start object marker.
     * parser.nextToken();
     * parser.nextToken();
     * parser.nextToken();
     * // Retrieve the Person object
     * // from the JSON string.
     * Person obj =
     *    (Person)parser.readValueAsStrict(
     *       Person.class);
     * System.assertEquals(
     *    obj.name, 'John Smith');
     * System.assertEquals(
     *    obj.phone, '555-1212');
     */
    global Object readValueAsStrict(System.Type apexType) { return null; }

    /**
     * Skips all child tokens of type JSONToken.START_ARRAY and JSONToken.START_OBJECT that the parser currently points to.
     */
    global void skipChildren() { }

    global override virtual String toString() { return null; }
}