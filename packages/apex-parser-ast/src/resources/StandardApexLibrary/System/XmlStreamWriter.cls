/**
 * The XmlStreamWriter class provides methods for writing XML data.
 * Usage
 * You can use the XmlStreamWriter class to programmatically construct an XML document, then use HTTP classes to send the document to an external server.
 * The XmlStreamWriter class is similar to the XMLStreamWriter utility class from StAX (Streaming API for XML). StAX is an API to read and write XML documents, originating from the Java programming language community.
 * Note
 * The XmlStreamWriter class in Apex is based on its counterpart in Java. See <a class="xref" href="http://docs.oracle.com/javase/6/docs/api/javax/xml/stream/XMLStreamWriter.html" target="_blank" title="html (New Window)">Java XMLStreamWriter class</a>.
 */
global class XmlStreamWriter {
    /**
     * Creates a new instance of the XmlStreamWriter class.
     */
    global XmlStreamWriter() { }

    /**
     * Closes this instance of an XmlStreamWriter and free any resources associated with it.
     */
    global void close() { }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the XML written by the XmlStreamWriter instance.
     */
    global String getXmlString() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Binds the specified URI to the default namespace. This URI is bound in the scope of the current START_ELEMENT – END_ELEMENT pair.
     */
    global void setDefaultNamespace(String uri) { }

    global String toString() { return null; }

    /**
     * Writes an attribute to the output stream.
     */
    global void writeAttribute(String prefix, String namespaceURI, String localName, String value) { }

    /**
     * Writes the specified CData to the output stream.
     */
    global void writeCData(String data) { }

    /**
     * Writes the specified text to the output stream.
     */
    global void writeCharacters(String text) { }

    /**
     * Writes the specified comment to the output stream.
     */
    global void writeComment(String data) { }

    /**
     * Writes the specified namespace to the output stream.
     */
    global void writeDefaultNamespace(String namesapceURI) { }

    /**
     * Writes an empty element tag to the output stream.
     */
    global void writeEmptyElement(String prefix, String localName, String namesapceURI) { }

    /**
     * Closes any start tags and writes corresponding end tags to the output stream.
     */
    global void writeEndDocument() { }

    /**
     * Writes an end tag to the output stream, relying on the internal state of the writer to determine the prefix and local name.
     */
    global void writeEndElement() { }

    /**
     * Writes the specified namespace to the output stream.
     */
    global void writeNamespace(String prefix, String namesapceURI) { }

    /**
     * Writes the specified processing instruction.
     */
    global void writeProcessingInstruction(String target, String data) { }

    /**
     * Writes the XML Declaration using the specified XML encoding and version.
     */
    global void writeStartDocument(String encoding, String version) { }

    /**
     * Writes the start tag specified by localName to the output stream.
     */
    global void writeStartElement(String prefix, String localName, String namesapceURI) { }
}