/**
 * Contains methods to add zip entries, generate a zipped archive, and return the result as an Apex blob.
 * <p>Example
 * This sample code compresses email attachments into a single file.
 * Compression.ZipWriter writer = new Compression.ZipWriter();
 *
 * List<id> contentDocumentIds = new List<id>();
 *
 * // Add IDs of documents to be compressed to contentDocumentIds
 *
 * for ( ContentVersion cv : [SELECT PathOnClient, Versiondata
 *                            FROM ContentVersion
 *                            WHERE ContentDocumentId IN :contentDocumentIds])
 * {
 *       writer.addEntry(cv.PathOnClient, cv.versiondata);
 * }
 *
 * blob zipAttachment = writer.getArchive();
 *
 * Messaging.EmailFileAttachment efa = new Messaging.EmailFileAttachment();
 * efa.setFileName('attachments.zip');
 * efa.setBody(zipAttachment);
 *
 * List<Messaging.EmailFileAttachment> fileAttachments = new List<Messaging.EmailFileAttachment>();
 * fileAttachments.add(efa);
 *
 * Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
 *
 * // Set all the other email fields, such as addresses, subject, and body
 *
 * email.setFileAttachments(fileAttachments);
 *
 * Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });
 */
global with sharing class ZipWriter {
    /**
     * Creates a new instance of the ZipWriter class.
     */
    global Object ZipWriter() { return null; }

    /**
     * Adds a copy of the specified prototype entry to the zip file and includes details such as the zip entry name, comment, last modification time, and content.
     */
    global compression.ZipEntry addEntry(compression.ZipEntry prototype) { return null; }

    /**
     * Adds an entry to the zip file with the specified name and content.
     * @return Zip entry added to the zip file.
     */
    global compression.ZipEntry addEntry(String name, Blob data) { return null; }

    /**
     * Adds an entry to the zip file with the specified name, comment, last modification time, compression method, and content.
     * @return Zip entry added to the zip file.
     */
    global compression.ZipEntry addEntry(String name, String comment, Datetime modTime, compression.Method m, Blob data) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Compresses the zip entries and generates a ZIP archive.
     * @return Apex blob that contains the bytes of the compression operation.
     */
    global Blob getArchive() { return null; }

    /**
     * Gets a list of all the entries in the zip file.
     */
    global List getEntries() { return null; }

    /**
     * Gets the entry with the specified name from the zip file.
     */
    global compression.ZipEntry getEntry(String name) { return null; }

    /**
     * Gets a set of all the zip entry names in the zip file.
     */
    global Set getEntryNames() { return null; }

    /**
     * Gets the compression level of the zip file.
     * @return Uses the Level enum values to indicate the compression level as BEST_COMPRESSION, BEST_SPEED, DEFAULT_LEVEL, or NO_COMPRESSION.
     */
    global compression.Level getLevel() { return null; }

    /**
     * Gets the compression method of the zip file.
     * @return Uses the Method enum values to indicate the compression method as DEFLATED or STORED.
     */
    global compression.Method getMethod() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Removes the entry with the specified name from the zip file.
     */
    global void removeEntry(String name) { }

    /**
     * Sets the compression level of the zip file.
     * @return Returns the zip file set with the specified compression level.
     */
    global compression.ZipWriter setLevel(compression.Level value) { return null; }

    /**
     * Sets the compression method for the zip file.
     * @return Returns the zip file set with the specified compression method.
     */
    global compression.ZipWriter setMethod(compression.Method value) { return null; }

    global override virtual String toString() { return null; }
}