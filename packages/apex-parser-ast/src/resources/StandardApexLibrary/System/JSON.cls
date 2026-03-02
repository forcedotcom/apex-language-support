/**
 * Contains methods for serializing Apex objects into JSON format and deserializing JSON content that was serialized using the serialize method in this class.
 */
public class JSON {

  /**
   * Returns a new JSON generator.
   * @param prettyPrint Determines whether the JSON generator creates JSON content in pretty-print format with the content indented. Set to true to create indented content.
   * @return System.JSONGenerator
   */
  public static System.JSONGenerator createGenerator(Boolean prettyPrint) {}

  /**
   * Returns a new JSON parser.
   * @param jsonString The JSON content to parse.
   * @return System.JSONParser
   */
  public static System.JSONParser createParser(String jsonString) {}

  /**
   * Deserializes the specified JSON string into an Apex object of the specified type.
   * @param jsonString The JSON content to deserialize.
   * @param apexType The Apex type of the object that this method creates after deserializing the JSON content.
   * @return Object
   */
  public static Object deserialize(String jsonString, System.Type apexType) {}

  /**
   * Deserializes the specified JSON string into an Apex object of the specified type.
   * @param jsonString The JSON content to deserialize.
   * @param apexType The Apex type of the object that this method creates after deserializing the JSON content.
   * @return Object
   */
  public static Object deserializeStrict(String jsonString, System.Type apexType) {}

  /**
   * Deserializes the specified JSON string into collections of primitive data types.
   * @param jsonString The JSON content to deserialize.
   * @return Object
   */
  public static Object deserializeUntyped(String jsonString) {}

  /**
   * Serializes Apex objects into JSON content.
   * @param objectToSerialize The Apex object to serialize.
   * @return String
   */
  public static String serialize(Object objectToSerialize) {}

  /**
   * Serializes Apex objects into JSON content.
   * @param objectToSerialize The Apex object to serialize.
   * @param suppressApexObjectNulls 
   * @return String
   */
  public static String serialize(Object objectToSerialize, Boolean suppressApexObjectNulls) {}

  /**
   * Serializes Apex objects into JSON content and generates indented content using the pretty-print format.
   * @param objectToSerialize The Apex object to serialize.
   * @return String
   */
  public static String serializePretty(Object objectToSerialize) {}

  /**
   * Serializes Apex objects into JSON content and generates indented content using the pretty-print format.
   * @param objectToSerialize The Apex object to serialize.
   * @param suppressApexObjectNulls 
   * @return String
   */
  public static String serializePretty(Object objectToSerialize, Boolean suppressApexObjectNulls) {}

}