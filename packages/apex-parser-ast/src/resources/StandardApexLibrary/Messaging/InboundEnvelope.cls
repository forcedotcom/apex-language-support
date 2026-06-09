/**
 * The InboundEnvelope object stores the envelope information associated with the inbound email, and has the following fields.
 */
global class InboundEnvelope {

  global InboundEnvelope() {}

  global String fromAddress;

  global String toAddress;

  global Object clone() {}

}