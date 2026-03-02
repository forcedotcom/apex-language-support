/**
 * The XmlStreamWriter class provides methods for writing XML data.
 */
public class XmlStreamWriter {

  /**
   * Closes this instance of an XmlStreamWriter and free any resources associated with it.
   * @return Void
   */
  public Void close() {}

  /**
   * Returns the XML written by the XmlStreamWriter instance.
   * @return String
   */
  public String getXmlString() {}

  /**
   * Binds the specified URI to the default namespace. This URI is bound in the scope of the current START_ELEMENT – END_ELEMENT pair.
   * @param uri 
   * @return Void
   */
  public Void setDefaultNamespace(String uri) {}

  /**
   * Writes an attribute to the output stream.
   * @param prefix 
   * @param namespaceUri 
   * @param localName Specifies the name of the attribute.
   * @param value 
   * @return Void
   */
  public Void writeAttribute(String prefix, String namespaceUri, String localName, String value) {}

  /**
   * Writes the specified CData to the output stream.
   * @param data 
   * @return Void
   */
  public Void writeCData(String data) {}

  /**
   * Writes the specified text to the output stream.
   * @param text 
   * @return Void
   */
  public Void writeCharacters(String text) {}

  /**
   * Writes the specified comment to the output stream.
   * @param comment 
   * @return Void
   */
  public Void writeComment(String comment) {}

  /**
   * Writes the specified namespace to the output stream.
   * @param namespaceUri 
   * @return Void
   */
  public Void writeDefaultNamespace(String namespaceUri) {}

  /**
   * Writes an empty element tag to the output stream.
   * @param prefix 
   * @param localName Specifies the name of the tag to be written.
   * @param namespaceUri 
   * @return Void
   */
  public Void writeEmptyElement(String prefix, String localName, String namespaceUri) {}

  /**
   * Closes any start tags and writes corresponding end tags to the output stream.
   * @return Void
   */
  public Void writeEndDocument() {}

  /**
   * Writes an end tag to the output stream, relying on the internal state of the writer to determine the prefix and local name.
   * @return Void
   */
  public Void writeEndElement() {}

  /**
   * Writes the specified namespace to the output stream.
   * @param prefix 
   * @param namespaceUri 
   * @return Void
   */
  public Void writeNamespace(String prefix, String namespaceUri) {}

  /**
   * Writes the specified processing instruction.
   * @param target 
   * @param data 
   * @return Void
   */
  public Void writeProcessingInstruction(String target, String data) {}

  /**
   * Writes the XML Declaration using the specified XML encoding and version.
   * @param encoding 
   * @param version 
   * @return Void
   */
  public Void writeStartDocument(String encoding, String version) {}

  /**
   * Writes the start tag specified by localName to the output stream.
   * @param prefix 
   * @param localName 
   * @param namespaceUri 
   * @return Void
   */
  public Void writeStartElement(String prefix, String localName, String namespaceUri) {}

}