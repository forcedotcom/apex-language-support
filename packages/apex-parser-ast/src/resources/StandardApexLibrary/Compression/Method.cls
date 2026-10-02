/**
 * Specifies the compression method for the zip entries.
 * <p>Usage
 * Use the Method enum with the getMethod() and setMethod(method) methods in the ZipEntry and ZipWriter classes.
 * <p>Enum Values
 * The following are the values of the Compression.Method enum.
 */
global enum Method {
    DEFLATED,
    STORED

}