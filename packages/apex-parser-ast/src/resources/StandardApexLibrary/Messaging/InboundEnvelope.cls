/**
 * The InboundEnvelope object stores the envelope information associated with the inbound email, and has the following fields.
 */
global class InboundEnvelope {
    /**
     * The name that appears in the From field of the envelope, if any.
     * <p>String
     */
    global webservice String fromAddress;
    /**
     * The name that appears in the To field of the envelope, if any.
     * <p>String
     */
    global webservice String toAddress;

    global Object InboundEnvelope() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}