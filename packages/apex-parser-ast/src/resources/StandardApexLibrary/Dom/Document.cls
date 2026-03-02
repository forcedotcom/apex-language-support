/**
 * Use the Document class to process XML content. You can parse nested XML content that’s up to 50 nodes deep.
 */
public class Document {

  /**
   * Creates the top-level root element for a document.
   * @param name 
   * @param namespace 
   * @param prefix 
   * @return Dom.XmlNode
   */
  public Dom.XmlNode createRootElement(String name, String namespace, String prefix) {}

  /**
   * Returns the top-level root element node in the document. If this method returns null , the root element has not been created yet.
   * @return Dom.XmlNode
   */
  public Dom.XmlNode getRootElement() {}

  /**
   * Parse the XML representation of the document specified in the xml argument and load it into a document.
   * @param xml 
   * @return Void
   */
  public Void load(String xml) {}

  /**
   * Returns the XML representation of the document as a String.
   * @return String
   */
  public String toXmlString() {}

}