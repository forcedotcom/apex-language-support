/**
 * Use the XmlNode class to work with a node in an XML document.
 */
public class XmlNode {

  /**
   * Creates a child element node for this node.
   * @param name The name argument can't have a null value.
   * @param namespace 
   * @param prefix 
   * @return Dom.XmlNode
   */
  public Dom.XmlNode addChildElement(String name, String namespace, String prefix) {}

  /**
   * Creates a child comment node for this node.
   * @param text The text argument can't have a null value.
   * @return Dom.XmlNode
   */
  public Dom.XmlNode addCommentNode(String text) {}

  /**
   * Creates a child text node for this node.
   * @param text The text argument can't have a null value.
   * @return Dom.XmlNode
   */
  public Dom.XmlNode addTextNode(String text) {}

  /**
   * Returns namespacePrefix:attributeValue for the given key and key namespace.
   * @param key 
   * @param keyNamespace 
   * @return String
   */
  public String getAttribute(String key, String keyNamespace) {}

  /**
   * Returns the number of attributes for this node.
   * @return Integer
   */
  public Integer getAttributeCount() {}

  /**
   * Returns the attribute key for the given index. Index values start at 0.
   * @param index 
   * @return String
   */
  public String getAttributeKeyAt(Integer index) {}

  /**
   * Returns the attribute key namespace for the given index.
   * @param index 
   * @return String
   */
  public String getAttributeKeyNsAt(Integer index) {}

  /**
   * Returns the attribute value for the given key and key namespace.
   * @param key 
   * @param keyNamespace 
   * @return String
   */
  public String getAttributeValue(String key, String keyNamespace) {}

  /**
   * Returns the attribute value namespace for the given key and key namespace.
   * @param key 
   * @param keyNamespace 
   * @return String
   */
  public String getAttributeValueNs(String key, String keyNamespace) {}

  /**
   * Returns the child element node for the node with the given name and namespace.
   * @param name 
   * @param namespace 
   * @return Dom.XmlNode
   */
  public Dom.XmlNode getChildElement(String name, String namespace) {}

  /**
   * Returns the child element nodes for this node. This doesn't include child text or comment nodes.
   * @return Dom.XmlNode[]
   */
  public Dom.XmlNode[] getChildElements() {}

  /**
   * Returns the child nodes for this node. This includes all node types.
   * @return Dom.XmlNode[]
   */
  public Dom.XmlNode[] getChildren() {}

  /**
   * Returns the element name.
   * @return String
   */
  public String getName() {}

  /**
   * Returns the namespace of the element.
   * @return String
   */
  public String getNamespace() {}

  /**
   * Returns the namespace of the element for the given prefix.
   * @param prefix 
   * @return String
   */
  public String getNamespaceFor(String prefix) {}

  /**
   * Returns the node type.
   * @return Dom.XmlNodeType
   */
  public Dom.XmlNodeType getNodeType() {}

  /**
   * Returns the parent of this element.
   * @return Dom.XmlNode
   */
  public Dom.XmlNode getParent() {}

  /**
   * Returns the prefix of the given namespace.
   * @param namespace The namespace argument can't have a null value.
   * @return String
   */
  public String getPrefixFor(String namespace) {}

  /**
   * Returns the text for this node.
   * @return String
   */
  public String getText() {}

  /**
   * Inserts a new child node before the specified node.
   * @param newChild The node to insert.
   * @param refChild The node before the new node.
   * @return Dom.XmlNode
   */
  public Dom.XmlNode insertBefore(Dom.XmlNode newChild, Dom.XmlNode refChild) {}

  /**
   * Removes the attribute with the given key and key namespace. Returns true if successful, false otherwise.
   * @param key 
   * @param keyNamespace 
   * @return Boolean
   */
  public Boolean removeAttribute(String key, String keyNamespace) {}

  /**
   * Removes the given child node.
   * @param childNode 
   * @return Boolean
   */
  public Boolean removeChild(Dom.XmlNode childNode) {}

  /**
   * Sets the key attribute value.
   * @param key 
   * @param value 
   * @return Void
   */
  public Void setAttribute(String key, String value) {}

  /**
   * Sets the key attribute value.
   * @param key 
   * @param value 
   * @param keyNamespace 
   * @param valueNamespace 
   * @return Void
   */
  public Void setAttributeNs(String key, String value, String keyNamespace, String valueNamespace) {}

  /**
   * Sets the namespace for the given prefix.
   * @param prefix 
   * @param namespace 
   * @return Void
   */
  public Void setNamespace(String prefix, String namespace) {}

}