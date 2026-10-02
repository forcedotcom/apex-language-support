/**
 * Contains methods to get information about zip entries and to extract content for specified zip entries from the zip file.
 */
global with sharing class ZipReader {
    /**
     * Creates a new instance of the ZipReader class using the specified blob data.
     */
    global Object ZipReader(Blob apexData) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Extracts the bytes for the specified zip entry and decompresses the content.
     * @return Apex blob that contains the decompressed content.
     */
    global Blob extract(compression.ZipEntry entry) { return null; }

    /**
     * Extracts the bytes for the specified zip entry name and decompresses the content.
     * @return Apex blob that contains the decompressed content.
     */
    global Blob extract(String name) { return null; }

    /**
     * Gets a list of all the entries from the zip file.
     */
    global List getEntries() { return null; }

    /**
     * Gets a map of names and the corresponding zip entries from the zip file.
     */
    global Map getEntriesMap() { return null; }

    /**
     * Gets a zip entry for the specified name from the zip file.
     * @return Throws a ZipException if the specified name isn’t found.
     */
    global compression.ZipEntry getEntry(String name) { return null; }

    /**
     * Gets a list of all the zip entry names from the zip file.
     */
    global List getEntryNames() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}