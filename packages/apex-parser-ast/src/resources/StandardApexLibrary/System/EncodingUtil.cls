/**
 * Use the methods in the EncodingUtil class to encode and decode URL strings, and convert strings to hexadecimal format.
 * Usage
 * Note
 * You cannot use the EncodingUtil methods to move documents with non-ASCII characters to Salesforce. You can, however, download a document from Salesforce. To do so, query the ID of the document using the API query call, then request it by ID.
 */
global class EncodingUtil {
    global EncodingUtil() { }

    /**
     * Converts a Base64-encoded String to a Blob representing its normal form.
     */
    global static Blob base64Decode(String s) { return null; }

    /**
     * Converts a Blob to an unencoded String representing its normal form.
     */
    global static String base64Encode(Blob s) { return null; }

    /**
     * Converts the specified hexadecimal (base 16) string to a Blob value and returns this Blob value.
     * Usage
     * Each byte in the Blob is constructed from two hexadecimal characters in the input string.
     * The convertFromHex method throws the following exceptions.
     * NullPointerException — the inputString is null.
     * InvalidParameterValueException — the inputString contains invalid hexadecimal characters or doesn’t contain an even number of characters.
     * Example
     * Blob blobValue = EncodingUtil.convertFromHex('4A4B4C');
     * System.assertEquals('JKL', blobValue.toString());
     */
    global static Blob convertFromHex(String input) { return null; }

    /**
     * Returns a hexadecimal (base 16) representation of the inputBlob. This method can be used to compute the client response (for example, HA1 or HA2) for HTTP Digest Authentication (RFC2617).
     */
    global static String convertToHex(Blob s) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    /**
     * Decodes a string in application/x-www-form-urlencoded format using a specific encoding scheme, for example “UTF-8.”
     * Usage
     * This method uses the supplied encoding scheme to determine which characters are represented by any consecutive sequence of the form \"%xy". For more information about the format, see <a class="xref" href="http://www.w3.org/MarkUp/html-spec/html-spec_8.html#SEC8.2.1" target="_blank">The form-urlencoded Media Type</a> in Hypertext Markup Language - 2.0.
     */
    global static String urlDecode(String s, String enc) { return null; }

    /**
     * Encodes a string into the application/x-www-form-urlencoded format using a specific encoding scheme, for example “UTF-8.”
     * Usage
     * The rules that apply when the method encodes a string:
     * These characters remain the same:
     * Alphanumeric characters A - Z, a - z, and 0 -9.
     * Special characters dot (.), hyphen (-), asterisk (*), and under score (_).
     * The space character is converted to a plus sign (+).
     * All other characters are unsafe. This method uses the supplied encoding scheme to obtain the bytes for unsafe characters. For more information about the format, see <a class="xref" href="https://www.w3.org/MarkUp/html-spec/html-spec_8.html#SEC8.2.1" target="_blank">The form-urlencoded Media Type</a> in Hypertext Markup Language - 2.0.
     * Example
     * String encoded = EncodingUtil.urlEncode(url, 'UTF-8');
     */
    global static String urlEncode(String s, String enc) { return null; }
}