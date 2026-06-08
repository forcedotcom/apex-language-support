/**
 * The InboundEnvelope object stores the envelope information associated with the inbound email, and has the following fields.
 */
global class InboundEnvelope {

  global InboundEnvelope() {}

  public String fromAddress;

  public String toAddress;

  global Object clone() {}

}