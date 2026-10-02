/**
 * Generic payment gateway response interface. This class extends the CaptureResponse, AbstractTransactionResponse, and AbstractResponse classes and inherits all their properties. It has no unique methods or parameters.
 */
global interface GatewayResponse {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}