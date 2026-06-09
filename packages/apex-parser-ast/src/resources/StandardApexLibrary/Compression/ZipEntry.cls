/**
 * Contains methods to get and set information about a zip file entry.
 */
global class ZipEntry {

  global ZipEntry() {}

  global Boolean equals(Object obj) {}

  global Integer hashcode() {}

  global string getComment() {}

  global long getCompressedSize() {}

  global blob getContent() {}

  global long getCrc() {}

  global Datetime getLastModifiedTime() {}

  global Compression.Method getMethod() {}

  global string getName() {}

  global long getUncompressedSize() {}

  global Compression.ZipEntry setComment(String comment) {}

  global Compression.ZipEntry setContent(Blob blob) {}

  global Compression.ZipEntry setLastModifiedTime(Datetime modTime) {}

  global Compression.ZipEntry setMethod(Compression.Method method) {}

  global string toString() {}

  global Object clone() {}

}