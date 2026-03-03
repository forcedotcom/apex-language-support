/**
 * Contains methods to add zip entries, generate a zipped archive, and return the result as an Apex blob.
 */
global class ZipWriter {

  public Compression.ZipEntry addEntry(string name, blob data) {}

  public Compression.ZipEntry addEntry(compression.ZipEntry prototype) {}

  public Compression.ZipEntry addEntry(String name, String comment, Datetime modTime, Compression.Method method, Blob data) {}

  public blob getArchive() {}

  public List<Compression.ZipEntry> getEntries() {}

  public compression.ZipEntry getEntry(string name) {}

  public Set<String> getEntryNames() {}

  public Compression.Level getLevel() {}

  public Compression.Method getMethod() {}

  public void removeEntry(string name) {}

  public Compression.ZipWriter setLevel(compression.Level value) {}

  public Compression.ZipWriter setMethod(compression.Method value) {}

}