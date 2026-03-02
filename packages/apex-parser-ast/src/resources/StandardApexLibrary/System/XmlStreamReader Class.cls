/**
 * The XmlStreamReader class provides methods for forward, read-only access to XML data. You can pull data from XML or skip unwanted events. You can parse nested XML content that’s up to 50 nodes deep.
 */
public class XmlStreamReader Class {

  /**
   * Returns the number of attributes on the start element, excluding namespace definitions.
   * @return Integer
   */
  public Integer getAttributeCount() {}

  /**
   * Returns the local name of the attribute at the specified index.
   * @param index 
   * @return String
   */
  public String getAttributeLocalName(Integer index) {}

  /**
   * Returns the namespace URI of the attribute at the specified index.
   * @param index 
   * @return String
   */
  public String getAttributeNamespace(Integer index) {}

  /**
   * Returns the prefix of this attribute at the specified index.
   * @param index 
   * @return String
   */
  public String getAttributePrefix(Integer index) {}

  /**
   * Returns the XML type of the attribute at the specified index.
   * @param index 
   * @return String
   */
  public String getAttributeType(Integer index) {}

  /**
   * Returns the value of the attribute in the specified localName at the specified URI.
   * @param namespaceUri 
   * @param localName 
   * @return String
   */
  public String getAttributeValue(String namespaceUri, String localName) {}

  /**
   * Returns the value of the attribute at the specified index.
   * @param index 
   * @return String
   */
  public String getAttributeValueAt(Integer index) {}

  /**
   * Returns the type of XML event the cursor is pointing to.
   * @return System.XmlTag
   */
  public System.XmlTag getEventType() {}

  /**
   * Returns the local name of the current event.
   * @return String
   */
  public String getLocalName() {}

  /**
   * Return the current location of the cursor.
   * @return String
   */
  public String getLocation() {}

  /**
   * If the current event is a start element or end element, this method returns the URI of the prefix or the default namespace.
   * @return String
   */
  public String getNamespace() {}

  /**
   * Returns the number of namespaces declared on a start element or end element.
   * @return Integer
   */
  public Integer getNamespaceCount() {}

  /**
   * Returns the prefix for the namespace declared at the index.
   * @param index 
   * @return String
   */
  public String getNamespacePrefix(Integer index) {}

  /**
   * Return the URI for the given prefix.
   * @param prefix 
   * @return String
   */
  public String getNamespaceURI(String prefix) {}

  /**
   * Returns the URI for the namespace declared at the index.
   * @param index 
   * @return String
   */
  public String getNamespaceURIAt(Integer index) {}

  /**
   * Returns the data section of a processing instruction.
   * @return String
   */
  public String getPIData() {}

  /**
   * Returns the target section of a processing instruction.
   * @return String
   */
  public String getPITarget() {}

  /**
   * Returns the prefix of the current XML event or null if the event does not have a prefix.
   * @return String
   */
  public String getPrefix() {}

  /**
   * Returns the current value of the XML event as a string.
   * @return String
   */
  public String getText() {}

  /**
   * Returns the XML version specified on the XML declaration. Returns null if none was declared.
   * @return String
   */
  public String getVersion() {}

  /**
   * Returns true if the current XML event has a name. Returns false otherwise.
   * @return Boolean
   */
  public Boolean hasName() {}

  /**
   * Returns true if there are more XML events and false if there are no more XML events.
   * @return Boolean
   */
  public Boolean hasNext() {}

  /**
   * Returns true if the current event has text, false otherwise.
   * @return Boolean
   */
  public Boolean hasText() {}

  /**
   * Returns true if the cursor points to a character data XML event. Otherwise, returns false .
   * @return Boolean
   */
  public Boolean isCharacters() {}

  /**
   * Returns true if the cursor points to an end tag. Otherwise, it returns false .
   * @return Boolean
   */
  public Boolean isEndElement() {}

  /**
   * Returns true if the cursor points to a start tag. Otherwise, it returns false .
   * @return Boolean
   */
  public Boolean isStartElement() {}

  /**
   * Returns true if the cursor points to a character data XML event that consists of all white space. Otherwise it returns false .
   * @return Boolean
   */
  public Boolean isWhiteSpace() {}

  /**
   * Reads the next XML event. A processor may return all contiguous character data in a single chunk, or it may split it into several chunks. Returns an integer which indicates the type of event.
   * @return Integer
   */
  public Integer next() {}

  /**
   * Skips any white space (the isWhiteSpace method returns true ), comment, or processing instruction XML events, until a start element or end element is reached. Returns the index for that XML event.
   * @return Integer
   */
  public Integer nextTag() {}

  /**
   * If you specify true for returnAsSingleBlock , text is returned in a single block, from a start element to the first end element or the next start element, whichever comes first. If you specify it as false , the parser may return text in multiple blocks.
   * @param returnAsSingleBlock 
   * @return Void
   */
  public Void setCoalescing(Boolean returnAsSingleBlock) {}

  /**
   * If you specify true for isNamespaceAware , the parser recognizes namespace. If you specify it as false , the parser does not. The default value is true .
   * @param isNamespaceAware 
   * @return Void
   */
  public Void setNamespaceAware(Boolean isNamespaceAware) {}

  /**
   * Returns a string containing the length of the input XML given to XmlStreamReader and the first 50 characters of the input XML.
   * @return String
   */
  public String toString() {}

}