/**
 * Contains methods to get information about zip entries and to extract content for specified zip entries from the zip file.
 */
global class ZipReader {

  global ZipReader(Blob data) {}

  global blob extract(string name) {}

  global blob extract(Compression.ZipEntry entry) {}

  global List<compression.ZipEntry> getEntries() {}

  global Map<String,Compression.ZipEntry> getEntriesMap() {}

  global compression.ZipEntry getEntry(string name) {}

  global List<String> getEntryNames() {}

  global Object clone() {}

}