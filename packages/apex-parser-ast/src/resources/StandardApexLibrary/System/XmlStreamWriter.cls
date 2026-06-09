/**
 * The XmlStreamWriter class provides methods for writing XML data.
 */
global class XmlStreamWriter {

  global XmlStreamWriter() {}

  /**
   * Closes this instance of an XmlStreamWriter and free any resources associated with it.
   */
  global void close() {}

  /**
   * Returns the XML written by the XmlStreamWriter instance.
   * @return String
   */
  global String getXmlString() {}

  /**
   * Binds the specified URI to the default namespace. This URI is bound in the scope of the current START_ELEMENT – END_ELEMENT pair.
   * @param uri 
   */
  global void setDefaultNamespace(String uri) {}

  /**
   * Writes an attribute to the output stream.
   * @param prefix 
   * @param namespaceUri 
   * @param localName Specifies the name of the attribute.
   * @param value 
   */
  global void writeAttribute(String prefix, String namespaceUri, String localName, String value) {}

  /**
   * Writes the specified CData to the output stream.
   * @param data 
   */
  global void writeCData(String data) {}

  /**
   * Writes the specified text to the output stream.
   * @param text 
   */
  global void writeCharacters(String text) {}

  /**
   * Writes the specified comment to the output stream.
   * @param comment 
   */
  global void writeComment(String comment) {}

  /**
   * Writes the specified namespace to the output stream.
   * @param namespaceUri 
   */
  global void writeDefaultNamespace(String namespaceUri) {}

  /**
   * Writes an empty element tag to the output stream.
   * @param prefix 
   * @param localName Specifies the name of the tag to be written.
   * @param namespaceUri 
   */
  global void writeEmptyElement(String prefix, String localName, String namespaceUri) {}

  /**
   * Closes any start tags and writes corresponding end tags to the output stream.
   */
  global void writeEndDocument() {}

  /**
   * Writes an end tag to the output stream, relying on the internal state of the writer to determine the prefix and local name.
   */
  global void writeEndElement() {}

  /**
   * Writes the specified namespace to the output stream.
   * @param prefix 
   * @param namespaceUri 
   */
  global void writeNamespace(String prefix, String namespaceUri) {}

  /**
   * Writes the specified processing instruction.
   * @param target 
   * @param data 
   */
  global void writeProcessingInstruction(String target, String data) {}

  /**
   * Writes the XML Declaration using the specified XML encoding and version.
   * @param encoding 
   * @param version 
   */
  global void writeStartDocument(String encoding, String version) {}

  /**
   * Writes the start tag specified by localName to the output stream.
   * @param prefix 
   * @param localName 
   * @param namespaceUri 
   */
  global void writeStartElement(String prefix, String localName, String namespaceUri) {}

  global Object clone() {}

}