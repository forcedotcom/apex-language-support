/**
 * Contains methods for serializing Apex objects into JSON format and deserializing JSON content that was serialized using the serialize method in this class.
 * <p>Usage
 * Use the methods in the System.JSON class to perform round-trip JSON serialization and deserialization of Apex objects.
 */
global class JSON {
    global JSON() { }

    /**
     * Returns a new JSON generator.
     */
    global static System.JSONGenerator createGenerator(Boolean pretty) { return null; }

    /**
     * Returns a new JSON parser.
     */
    global static System.JSONParser createParser(String jsonString) { return null; }

    /**
     * Deserializes the specified JSON string into an Apex object of the specified type.
     * <p>Usage
     * If the JSON content contains attributes not present in the System.Type argument, such as a missing field or object, deserialization fails in some circumstances. When deserializing JSON content into a custom object or an sObject using Salesforce API version 34.0 or earlier, this method throws a runtime exception when passed extraneous attributes. When deserializing JSON content into an Apex class in any API version, or into an object in API version 35.0 or later, no exception is thrown. When no exception is thrown, this method ignores extraneous attributes and parses the rest of the JSON content.
     * <p>Example
     * The following example deserializes a Decimal value.
     * Decimal n = (Decimal)JSON.deserialize(
     *                '100.1', Decimal.class);
     * System.assertEquals(n, 100.1);
     */
    global static Object deserialize(String jsonString, System.Type apexType) { return null; }

    /**
     * Deserializes the specified JSON string into an Apex object of the specified type.
     * <p>Usage
     * All attributes in the JSON string must be present in the specified type. If the JSON content contains attributes not present in the System.Type argument, such as a missing field or object, deserialization fails in some circumstances. When deserializing JSON content with extraneous attributes into an Apex class, this method throws an exception in all API versions. However, no exception is thrown when you use this method to deserialize JSON content into a custom object or an sObject.
     * <p>Example
     * The following example deserializes a JSON string into an object of a user-defined type represented by the Car class, which this example also defines.
     * public class Car {
     *     public String make;
     *     public String year;
     * }
     *
     * public void parse() {
     *     Car c = (Car)JSON.deserializeStrict(
     *         '{"make":"SFDC","year":"2020"}',
     *         Car.class);
     *     System.assertEquals(c.make, 'SFDC');
     *     System.assertEquals(c.year, '2020');
     * }
     */
    global static Object deserializeStrict(String jsonString, System.Type apexType) { return null; }

    /**
     * Deserializes the specified JSON string into collections of primitive data types.
     * <p>Example
     * The following example deserializes a JSON representation of an appliance object into a map that contains primitive data types and further collections of primitive types. It then verifies the deserialized values.
     * String jsonInput = '{\n' +
     *     ' "description" :"An appliance",\n' +
     *     ' "accessories" : [ "powerCord", ' +
     *       '{ "right":"door handle1", ' +
     *         '"left":"door handle2" } ],\n' +
     *     ' "dimensions" : ' +
     *       '{ "height" : 5.5 , ' +
     *         '"width" : 3.0 , ' +
     *         '"depth" : 2.2 },\n' +
     *     ' "type" : null,\n' +
     *     ' "inventory" : 2000,\n' +
     *     ' "price" : 1023.45,\n' +
     *     ' "isShipped" : true,\n' +
     *     ' "modelNumber" : "123"\n' +
     *     '}';
     *
     * Map<String, Object> m =
     *    (Map<String, Object>)
     *       JSON.deserializeUntyped(jsonInput);
     *
     * System.assertEquals(
     *    'An appliance', m.get('description'));
     *
     * List<Object> a =
     *    (List<Object>)m.get('accessories');
     * System.assertEquals('powerCord', a[0]);
     * Map<String, Object> a2 =
     *    (Map<String, Object>)a[1];
     * System.assertEquals(
     *    'door handle1', a2.get('right'));
     * System.assertEquals(
     *    'door handle2', a2.get('left'));
     *
     * Map<String, Object> dim =
     *    (Map<String, Object>)m.get('dimensions');
     * System.assertEquals(
     *    5.5, dim.get('height'));
     * System.assertEquals(
     *    3.0, dim.get('width'));
     * System.assertEquals(
     *    2.2, dim.get('depth'));
     *
     * System.assertEquals(null, m.get('type'));
     * System.assertEquals(
     *    2000, m.get('inventory'));
     * System.assertEquals(
     *    1023.45, m.get('price'));
     * System.assertEquals(
     *    true, m.get('isShipped'));
     * System.assertEquals(
     *    '123', m.get('modelNumber'));
     */
    global static Object deserializeUntyped(String jsonString) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Serializes Apex objects into JSON content.
     * <p>Example
     * The following example serializes a new Datetime value.
     * Datetime dt = Datetime.newInstance(
     *                Date.newInstance(
     *                   2011, 3, 22),
     *                Time.newInstance(
     *                   1, 15, 18, 0));
     *     String str = JSON.serialize(dt);
     *     System.assertEquals(
     *        '"2011-03-22T08:15:18.000Z"',
     *        str);
     */
    global static String serialize(Object o) { return null; }

    /**
     * Suppresses null values when serializing Apex objects into JSON content.
     * <p>Usage
     * This method allows you to specify whether to suppress null values when serializing Apex objects into JSON content.
     */
    global static String serialize(Object o, Boolean suppressApexObjectNulls) { return null; }

    /**
     * Serializes Apex objects into JSON content and generates indented content using the pretty-print format.
     */
    global static String serializePretty(Object o) { return null; }

    /**
     * Suppresses null values when serializing Apex objects into JSON content and generates indented content using the pretty-print format.
     */
    global static String serializePretty(Object o, Boolean suppressApexObjectNulls) { return null; }

    global override virtual String toString() { return null; }
}