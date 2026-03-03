/**
 * Contains methods to get information about zip entries and to extract content for specified zip entries from the zip file.
 */
global class ZipReader {

  public blob extract(string name) {}

  public blob extract(Compression.ZipEntry entry) {}

  public List<compression.ZipEntry> getEntries() {}

  public Map<String,Compression.ZipEntry> getEntriesMap() {}

  public compression.ZipEntry getEntry(string name) {}

  public List<String> getEntryNames() {}

}