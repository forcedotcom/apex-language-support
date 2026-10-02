/**
 * Contains methods to get and set information about a zip file entry.
 */
global with sharing class ZipEntry {
    /**
     * Compares this object with the specified object and returns true if both objects are equal; otherwise, returns false.
     */
    global Boolean equals(Object obj) { return false; }

    /**
     * Gets the comment string for the zip entry.
     */
    global String getComment() { return null; }

    /**
     * Gets the size in bytes of the compressed zip entry.
     */
    global Long getCompressedSize() { return 0L; }

    /**
     * Gets the content of the zip entry. This method doesn’t work with the ZipReader class.
     */
    global Blob getContent() { return null; }

    /**
     * Gets the cyclic redundancy check (CRC) value for the zip entry.
     */
    global Long getCrc() { return 0L; }

    /**
     * Gets the last modification timestamp of the zip entry.
     */
    global Datetime getLastModifiedTime() { return null; }

    /**
     * Gets the compression method of the zip entry.
     * @return Uses values from the Method enum and indicates whether the zip entry has DEFLATED or STORED method.
     */
    global compression.Method getMethod() { return null; }

    /**
     * Gets the name of the zip entry.
     */
    global String getName() { return null; }

    /**
     * Gets the uncompressed size in bytes of the zip entry content.
     */
    global Long getUncompressedSize() { return 0L; }

    /**
     * Returns the hash code value for the zip entry.
     */
    global override Integer hashCode() { return 0; }

    /**
     * Sets the comment string for the zip entry that’s written to the Zip archive. This method doesn’t work with the ZipReader class.
     */
    global compression.ZipEntry setComment(String comment) { return null; }

    /**
     * Sets the content of the zip entry that’s written to the Zip archive. This method doesn’t work with the ZipReader class.
     */
    global compression.ZipEntry setContent(Blob b) { return null; }

    /**
     * Sets the last modification time of the zip entry that’s written to the Zip archive. This method doesn’t work with the ZipReader class.
     */
    global compression.ZipEntry setLastModifiedTime(Datetime modTime) { return null; }

    /**
     * Sets the compression method for the zip entry that’s written to the zip archive. This method doesn’t work with the ZipReader class.
     */
    global compression.ZipEntry setMethod(compression.Method m) { return null; }

    /**
     * Returns a string representation of the zip entry.
     */
    global override String toString() { return null; }
}