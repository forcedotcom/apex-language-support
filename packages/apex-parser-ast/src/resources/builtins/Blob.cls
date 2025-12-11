/**
 * Contains methods for the Blob primitive data type.
 * Namespace: System
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_blob.htm
 */
public class Blob {
	/**
	 * Returns the size of this Blob in bytes.
	 * @return Size in bytes
	 */
	public Integer size() { }

	/**
	 * Returns a Blob constructed from the specified String using UTF-8 encoding.
	 * @param s The String to convert
	 * @return Blob constructed from the String
	 */
	public static Blob valueOf(String s) { }

	/**
	 * Returns a Blob constructed from the specified String using the specified encoding.
	 * @param s The String to convert
	 * @param encoding The encoding (e.g., 'UTF-8', 'ISO-8859-1')
	 * @return Blob constructed from the String
	 */
	public static Blob valueOf(String s, String encoding) { }

	/**
	 * Returns a String representation of this Blob using UTF-8 encoding.
	 * @return String representation
	 */
	public String toString() { }

	/**
	 * Returns a String representation of this Blob using the specified encoding.
	 * @param encoding The encoding (e.g., 'UTF-8', 'ISO-8859-1')
	 * @return String representation
	 */
	public String toString(String encoding) { }

	/**
	 * Returns a Blob that is the result of combining this Blob with the specified Blob.
	 * @param other The Blob to append
	 * @return Combined Blob
	 */
	public Blob append(Blob other) { }

	/**
	 * Returns a Blob that contains a copy of the specified portion of this Blob.
	 * @param startIndex The starting index (inclusive)
	 * @param length The number of bytes to copy
	 * @return Sub-blob
	 */
	public Blob subBlob(Integer startIndex, Integer length) { }

	/**
	 * Converts this Blob to a hexadecimal String representation.
	 * @return Hexadecimal String
	 */
	public String toHexString() { }

}

