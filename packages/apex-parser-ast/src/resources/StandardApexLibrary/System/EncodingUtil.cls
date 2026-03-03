/**
 * Use the methods in the EncodingUtil class to encode and decode URL strings, and convert strings to hexadecimal format.
 */
global class EncodingUtil {

  /**
   * Converts a Base64-encoded String to a Blob representing its normal form.
   * @param inputString 
   * @return Blob
   */
  public static Blob base64Decode(String inputString) {}

  /**
   * Converts a Blob to an unencoded String representing its normal form.
   * @param inputBlob 
   * @return String
   */
  public static String base64Encode(Blob inputBlob) {}

  /**
   * Converts the specified hexadecimal (base 16) string to a Blob value and returns this Blob value.
   * @param inputString The hexadecimal string to convert. The string can contain only valid hexadecimal characters (0-9, a-f, A-F) and must have an even number of characters.
   * @return Blob
   */
  public static Blob convertFromHex(String inputString) {}

  /**
   * Returns a hexadecimal (base 16) representation of the inputBlob . This method can be used to compute the client response (for example, HA1 or HA2) for HTTP Digest Authentication (RFC2617).
   * @param inputBlob 
   * @return String
   */
  public static String convertToHex(Blob inputBlob) {}

  /**
   * Decodes a string in application/x-www-form-urlencoded format using a specific encoding scheme, for example “UTF-8.”
   * @param inputString 
   * @param encodingScheme 
   * @return String
   */
  public static String urlDecode(String inputString, String encodingScheme) {}

  /**
   * Encodes a string into the application/x-www-form-urlencoded format using a specific encoding scheme, for example “UTF-8.”
   * @param inputString 
   * @param encodingScheme 
   * @return String
   */
  public static String urlEncode(String inputString, String encodingScheme) {}

}