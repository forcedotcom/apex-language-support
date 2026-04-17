/**
 * The XmlStreamWriter class provides methods for writing XML data.
 */
global class XmlStreamWriter {

  /**
   * Closes this instance of an XmlStreamWriter and free any resources associated with it.
   */
  public void close() {}

  /**
   * Returns the XML written by the XmlStreamWriter instance.
   * @return String
   */
  public String getXmlString() {}

  /**
   * Binds the specified URI to the default namespace. This URI is bound in the scope of the current START_ELEMENT – END_ELEMENT pair.
   * @param uri 
   */
  public void setDefaultNamespace(String uri) {}

  /**
   * Writes an attribute to the output stream.
   * @param prefix 
   * @param namespaceUri 
   * @param localName Specifies the name of the attribute.
   * @param value 
   */
  public void writeAttribute(String prefix, String namespaceUri, String localName, String value) {}

  /**
   * Writes the specified CData to the output stream.
   * @param data 
   */
  public void writeCData(String data) {}

  /**
   * Writes the specified text to the output stream.
   * @param text 
   */
  public void writeCharacters(String text) {}

  /**
   * Writes the specified comment to the output stream.
   * @param comment 
   */
  public void writeComment(String comment) {}

  /**
   * Writes the specified namespace to the output stream.
   * @param namespaceUri 
   */
  public void writeDefaultNamespace(String namespaceUri) {}

  /**
   * Writes an empty element tag to the output stream.
   * @param prefix 
   * @param localName Specifies the name of the tag to be written.
   * @param namespaceUri 
   */
  public void writeEmptyElement(String prefix, String localName, String namespaceUri) {}

  /**
   * Closes any start tags and writes corresponding end tags to the output stream.
   */
  public void writeEndDocument() {}

  /**
   * Writes an end tag to the output stream, relying on the internal state of the writer to determine the prefix and local name.
   */
  public void writeEndElement() {}

  /**
   * Writes the specified namespace to the output stream.
   * @param prefix 
   * @param namespaceUri 
   */
  public void writeNamespace(String prefix, String namespaceUri) {}

  /**
   * Writes the specified processing instruction.
   * @param target 
   * @param data 
   */
  public void writeProcessingInstruction(String target, String data) {}

  /**
   * Writes the XML Declaration using the specified XML encoding and version.
   * @param encoding 
   * @param version 
   */
  public void writeStartDocument(String encoding, String version) {}

  /**
   * Writes the start tag specified by localName to the output stream.
   * @param prefix 
   * @param localName 
   * @param namespaceUri 
   */
  public void writeStartElement(String prefix, String localName, String namespaceUri) {}

}