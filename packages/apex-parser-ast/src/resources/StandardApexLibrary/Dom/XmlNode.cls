/**
 * Use the XmlNode class to work with a node in an XML document.
 */
global class XmlNode {
    /**
     * Creates a child element node for this node.
     * Usage
     * If the namespace argument has a non-null value and the prefix argument is null, the namespace is set as the default namespace.
     * If the prefix argument is null, Salesforce automatically assigns a prefix for the element. The format of the automatic prefix is nsi, where i is a number.If the prefix argument is '', the namespace is set as the default namespace.
     */
    global dom.XmlNode addChildElement(String name, String namespace, String prefix) { return null; }

    /**
     * Creates a child comment node for this node.
     */
    global dom.XmlNode addCommentNode(String text) { return null; }

    /**
     * Creates a child text node for this node.
     */
    global dom.XmlNode addTextNode(String text) { return null; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns namespacePrefix:attributeValue for the given key and key namespace.
     * Example
     * For example, for the <xyz a:b="c:d" /> element:
     * getAttribute returns c:d
     * getAttributeValue returns d
     */
    global String getAttribute(String key, String keyNamespace) { return null; }

    /**
     * Returns the number of attributes for this node.
     */
    global Integer getAttributeCount() { return 0; }

    /**
     * Returns the attribute key for the given index. Index values start at 0.
     */
    global String getAttributeKeyAt(Integer index) { return null; }

    /**
     * Returns the attribute key namespace for the given index.
     */
    global String getAttributeKeyNsAt(Integer index) { return null; }

    /**
     * Returns the attribute value for the given key and key namespace.
     * Example
     * For example, for the <xyz a:b="c:d" /> element:
     * getAttribute returns c:d
     * getAttributeValue returns d
     */
    global String getAttributeValue(String key, String keyNamespace) { return null; }

    /**
     * Returns the attribute value namespace for the given key and key namespace.
     */
    global String getAttributeValueNs(String key, String keyNamespace) { return null; }

    /**
     * Returns the child element node for the node with the given name and namespace.
     */
    global dom.XmlNode getChildElement(String name, String namespace) { return null; }

    /**
     * Returns the child element nodes for this node. This doesn't include child text or comment nodes.
     */
    global List getChildElements() { return null; }

    /**
     * Returns the child nodes for this node. This includes all node types.
     */
    global List getChildren() { return null; }

    /**
     * Returns the element name.
     */
    global String getName() { return null; }

    /**
     * Returns the namespace of the element.
     */
    global String getNamespace() { return null; }

    /**
     * Returns the namespace of the element for the given prefix.
     */
    global String getNamespaceFor(String prefix) { return null; }

    /**
     * Returns the node type.
     * @return Uses XmlNodeType enum to return COMMENT, ELEMENT, or TEXT as the node type.
     */
    global Dom.XmlNodeType getNodeType() { return null; }

    /**
     * Returns the parent of this element.
     */
    global dom.XmlNode getParent() { return null; }

    /**
     * Returns the prefix of the given namespace.
     */
    global String getPrefixFor(String namespace) { return null; }

    /**
     * Returns the text for this node.
     */
    global String getText() { return null; }

    global Integer hashCode() { return 0; }

    global dom.XmlNode insertBefore(Object newChild, Object refChild) { return null; }

    /**
     * Removes the attribute with the given key and key namespace. Returns true if successful, false otherwise.
     */
    global Boolean removeAttribute(String key, String keyNamespace) { return false; }

    global Boolean removeChild(Object child) { return false; }

    /**
     * Sets the key attribute value.
     */
    global void setAttribute(String key, String value) { }

    /**
     * Sets the key attribute value.
     */
    global void setAttributeNs(String key, String value, String keyNamespace, String valueNamespace) { }

    /**
     * Sets the namespace for the given prefix.
     */
    global void setNamespace(String prefix, String namespace) { }

    global String toString() { return null; }
}