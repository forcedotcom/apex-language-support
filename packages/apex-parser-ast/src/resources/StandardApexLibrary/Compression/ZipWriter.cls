/**
 * Contains methods to add zip entries, generate a zipped archive, and return the result as an Apex blob.
 */
global class ZipWriter {

  global ZipWriter() {}

  global Compression.ZipEntry addEntry(string name, blob data) {}

  global Compression.ZipEntry addEntry(compression.ZipEntry prototype) {}

  global Compression.ZipEntry addEntry(String name, String comment, Datetime modTime, Compression.Method method, Blob data) {}

  global blob getArchive() {}

  global List<Compression.ZipEntry> getEntries() {}

  global compression.ZipEntry getEntry(string name) {}

  global Set<String> getEntryNames() {}

  global Compression.Level getLevel() {}

  global Compression.Method getMethod() {}

  global void removeEntry(string name) {}

  global Compression.ZipWriter setLevel(compression.Level value) {}

  global Compression.ZipWriter setMethod(compression.Method value) {}

  global Object clone() {}

}