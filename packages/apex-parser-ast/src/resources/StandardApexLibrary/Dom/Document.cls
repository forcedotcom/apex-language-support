/**
 * Use the Document class to process XML content. You can parse nested XML content that’s up to 50 nodes deep.
 * Usage
 * One common application is to use it to create the body of a request for HttpRequest or to parse a response accessed by HttpResponse.
 */
global class Document {
    /**
     * Creates a new instance of the Dom.Document class.
     */
    global Document() { }

    /**
     * Creates the top-level root element for a document.
     * Usage
     * For more information about namespaces, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_xml_dom.htm" target="_blank">Reading and Writing XML Using the DOM</a>.
     * Calling this method more than once on a document generates an error as a document can have only one root element.
     */
    global dom.XmlNode createRootElement(String name, String namespace, String prefix) { return null; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the top-level root element node in the document. If this method returns null, the root element has not been created yet.
     */
    global dom.XmlNode getRootElement() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Parse the XML representation of the document specified in the xml argument and load it into a document.
     * Example
     * Dom.Document doc = new Dom.Document();
     * doc.load(xml);
     */
    global void load(String xml) { }

    global String toString() { return null; }

    /**
     * Returns the XML representation of the document as a String.
     */
    global String toXmlString() { return null; }
}