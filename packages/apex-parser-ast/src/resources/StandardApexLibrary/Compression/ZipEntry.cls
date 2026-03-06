/**
 * Contains methods to get and set information about a zip file entry.
 */
global class ZipEntry {

  public Boolean equals(Object obj) {}

  public Integer hashcode() {}

  public string getComment() {}

  public long getCompressedSize() {}

  public blob getContent() {}

  public long getCrc() {}

  public Datetime getLastModifiedTime() {}

  public Compression.Method getMethod() {}

  public string getName() {}

  public long getUncompressedSize() {}

  public Compression.ZipEntry setComment(String comment) {}

  public Compression.ZipEntry setContent(Blob blob) {}

  public Compression.ZipEntry setLastModifiedTime(Datetime modTime) {}

  public Compression.ZipEntry setMethod(Compression.Method method) {}

  public string toString() {}

}