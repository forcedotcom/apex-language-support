/**
 * Contains methods for the Blob primitive data type.
 */
public class Blob {

  /**
   * Returns the number of bytes in the Blob.
   * @return Integer
   */
  public Integer size() {}

  /**
   * Creates a binary object out of the given string, encoding it as a PDF file.
   * @param stringToConvert 
   * @return Blob
   */
  public static Blob toPdf(String stringToConvert) {}

  /**
   * Casts the Blob into a String.
   * @return String
   */
  public String toString() {}

  /**
   * Casts the specified String to a Blob.
   * @param stringToBlob 
   * @return Blob
   */
  public static Blob valueOf(String stringToBlob) {}

}