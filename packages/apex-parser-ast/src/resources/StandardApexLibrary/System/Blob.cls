/**
 * Contains methods for the Blob primitive data type.
 */
global class Blob {

  global Blob() {}

  /**
   * Returns the number of bytes in the Blob.
   * @return Integer
   */
  global Integer size() {}

  /**
   * Creates a binary object out of the given string, encoding it as a PDF file.
   * @param stringToConvert 
   * @return Blob
   */
  global static Blob toPdf(String stringToConvert) {}

  /**
   * Casts the Blob into a String.
   * @return String
   */
  global String toString() {}

  /**
   * Casts the specified String to a Blob.
   * @param stringToBlob 
   * @return Blob
   */
  global static Blob valueOf(String stringToBlob) {}

  global Object clone() {}

}