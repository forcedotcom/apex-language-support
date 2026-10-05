/**
 * The XmlStreamReader class provides methods for forward, read-only access to XML data. You can pull data from XML or skip unwanted events. You can parse nested XML content that’s up to 50 nodes deep.
 * <p>Usage
 * The XmlStreamReader class is similar to the XMLStreamReader utility class from StAX (Streaming API for XML). StAX is an API to read and write XML documents, originating from the Java programming language community.
 * Note
 * The XmlStreamReader class in Apex is based on its counterpart in Java. See <a class="xref" href="http://download.oracle.com/javase/6/docs/api/javax/xml/stream/XMLStreamReader.html" target="_blank" title="html (New Window)">Java XMLStreamReader class</a>.
 */
global class XmlStreamReader {
    /**
     * Creates a new instance of the XmlStreamReader class for the specified XML input.
     */
    global XmlStreamReader(String xml) { }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the number of attributes on the start element, excluding namespace definitions.
     * <p>Usage
     * This method is only valid on a start element or attribute XML events. The count for the number of attributes for an attribute XML event starts with zero.
     */
    global Integer getAttributeCount() { return 0; }

    /**
     * Returns the local name of the attribute at the specified index.
     * <p>Usage
     * If there is no name, an empty string is returned. This method is only valid with start element or attribute XML events.
     */
    global String getAttributeLocalName(Integer index) { return null; }

    /**
     * Returns the namespace URI of the attribute at the specified index.
     * <p>Usage
     * If no namespace is specified, null is returned. This method is only valid with start element or attribute XML events.
     */
    global String getAttributeNamespace(Integer index) { return null; }

    /**
     * Returns the prefix of this attribute at the specified index.
     * <p>Usage
     * If no prefix is specified, null is returned. This method is only valid with start element or attribute XML events.
     */
    global String getAttributePrefix(Integer index) { return null; }

    /**
     * Returns the XML type of the attribute at the specified index.
     * <p>Usage
     * For example, id is an attribute type. This method is only valid with start element or attribute XML events.
     */
    global String getAttributeType(Integer index) { return null; }

    /**
     * Returns the value of the attribute in the specified localName at the specified URI.
     * <p>Usage
     * Returns null if the value is not found. You must specify a value for localName. This method is only valid with start element or attribute XML events.
     */
    global String getAttributeValue(String namespaceURI, String localName) { return null; }

    /**
     * Returns the value of the attribute at the specified index.
     * <p>Usage
     * This method is only valid with start element or attribute XML events.
     */
    global String getAttributeValueAt(Integer index) { return null; }

    /**
     * Returns the type of XML event the cursor is pointing to.
     * <p>XmlTag Enum
     * The values for XmlTag are:
     * ATTRIBUTE
     * CDATA
     * CHARACTERS
     * COMMENT
     * DTD
     * END_DOCUMENT
     * END_ELEMENT
     * ENTITY_DECLARATION
     * ENTITY_REFERENCE
     * NAMESPACE
     * NOTATION_DECLARATION
     * PROCESSING_INSTRUCTION
     * SPACE
     * START_DOCUMENT
     * START_ELEMENT
     */
    global System.XmlTag getEventType() { return null; }

    /**
     * Returns the local name of the current event.
     * <p>Usage
     * For start element or end element XML events, it returns the local name of the current element. For the entity reference XML event, it returns the entity name. The current XML event must be start element, end element, or entity reference.
     */
    global String getLocalName() { return null; }

    /**
     * Return the current location of the cursor.
     * <p>Usage
     * If the location is unknown, returns -1. The location information is only valid until the next method is called.
     */
    global String getLocation() { return null; }

    /**
     * If the current event is a start element or end element, this method returns the URI of the prefix or the default namespace.
     * <p>Usage
     * Returns null if the XML event does not have a prefix.
     */
    global String getNamespace() { return null; }

    /**
     * Returns the number of namespaces declared on a start element or end element.
     * <p>Usage
     * This method is only valid on a start element, end element, or namespace XML event.
     */
    global Integer getNamespaceCount() { return 0; }

    /**
     * Returns the prefix for the namespace declared at the index.
     * <p>Usage
     * Returns null if this is the default namespace declaration. This method is only valid on a start element, end element, or namespace XML event.
     */
    global String getNamespacePrefix(Integer index) { return null; }

    /**
     * Return the URI for the given prefix.
     * <p>Usage
     * The returned URI depends on the current state of the processor.
     */
    global String getNamespaceURI(String prefix) { return null; }

    /**
     * Returns the URI for the namespace declared at the index.
     * <p>Usage
     * This method is only valid on a start element, end element, or namespace XML event.
     */
    global String getNamespaceURIAt(Integer index) { return null; }

    /**
     * Returns the data section of a processing instruction.
     */
    global String getPIData() { return null; }

    /**
     * Returns the target section of a processing instruction.
     */
    global String getPITarget() { return null; }

    /**
     * Returns the prefix of the current XML event or null if the event does not have a prefix.
     */
    global String getPrefix() { return null; }

    /**
     * Returns the current value of the XML event as a string.
     * <p>Usage
     * The valid values for the different events are:
     * The string value of a character XML event
     * The string value of a comment
     * The replacement value for an entity reference. For example, assume getText reads the following XML snippet:
     * <!ENTITY
     *   Title "Salesforce For Dummies" >
     *      ]>
     *   <moo a="b">Name &Title;</moo>';
     * The getText method returns Salesforce for Dummies, not &Title.
     * The string value of a CDATA section
     * The string value for a space XML event
     * The string value of the internal subset of the DTD
     */
    global String getText() { return null; }

    /**
     * Returns the XML version specified on the XML declaration. Returns null if none was declared.
     */
    global String getVersion() { return null; }

    /**
     * Returns true if the current XML event has a name. Returns false otherwise.
     * <p>Usage
     * This method is only valid for start element and stop element XML events.
     */
    global Boolean hasName() { return false; }

    /**
     * Returns true if there are more XML events and false if there are no more XML events.
     * <p>Usage
     * This method returns false if the current XML event is end document.
     */
    global Boolean hasNext() { return false; }

    /**
     * Returns true if the current event has text, false otherwise.
     * <p>Usage
     * The following XML events have text: characters, entity reference, comment and space.
     */
    global Boolean hasText() { return false; }

    global Integer hashCode() { return 0; }

    /**
     * Returns true if the cursor points to a character data XML event. Otherwise, returns false.
     */
    global Boolean isCharacters() { return false; }

    /**
     * Returns true if the cursor points to an end tag. Otherwise, it returns false.
     */
    global Boolean isEndElement() { return false; }

    /**
     * Returns true if the cursor points to a start tag. Otherwise, it returns false.
     */
    global Boolean isStartElement() { return false; }

    /**
     * Returns true if the cursor points to a character data XML event that consists of all white space. Otherwise it returns false.
     */
    global Boolean isWhitespace() { return false; }

    /**
     * Reads the next XML event. A processor may return all contiguous character data in a single chunk, or it may split it into several chunks. Returns an integer which indicates the type of event.
     */
    global Integer next() { return 0; }

    /**
     * Skips any white space (the isWhiteSpace method returns true), comment, or processing instruction XML events, until a start element or end element is reached. Returns the index for that XML event.
     * <p>Usage
     * This method throws an error if elements other than white space, comments, processing instruction, start elements or stop elements are encountered.
     */
    global Integer nextTag() { return 0; }

    /**
     * If you specify true for returnAsSingleBlock, text is returned in a single block, from a start element to the first end element or the next start element, whichever comes first. If you specify it as false, the parser may return text in multiple blocks.
     */
    global void setCoalescing(Boolean flag) { }

    /**
     * If you specify true for isNamespaceAware, the parser recognizes namespace. If you specify it as false, the parser does not. The default value is true.
     */
    global void setNamespaceAware(Boolean flag) { }

    /**
     * Returns a string containing the length of the input XML given to XmlStreamReader and the first 50 characters of the input XML.
     */
    global String toString() { return null; }
}