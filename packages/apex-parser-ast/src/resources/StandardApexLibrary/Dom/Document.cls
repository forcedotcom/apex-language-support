/**
 * Use the Document class to process XML content. You can parse nested XML content that’s up to 50 nodes deep.
 */
global class Document {

  global Document() {}

  /**
   * Creates the top-level root element for a document.
   * @param name 
   * @param namespace 
   * @param prefix 
   * @return Dom.XmlNode
   */
  global Dom.XmlNode createRootElement(String name, String namespace, String prefix) {}

  /**
   * Returns the top-level root element node in the document. If this method returns null , the root element has not been created yet.
   * @return Dom.XmlNode
   */
  global Dom.XmlNode getRootElement() {}

  /**
   * Parse the XML representation of the document specified in the xml argument and load it into a document.
   * @param xml 
   */
  global void load(String xml) {}

  /**
   * Returns the XML representation of the document as a String.
   * @return String
   */
  global String toXmlString() {}

  global Object clone() {}

}