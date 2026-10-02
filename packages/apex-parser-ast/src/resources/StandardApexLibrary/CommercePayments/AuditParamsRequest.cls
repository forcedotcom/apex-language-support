/**
 * AuditParamsRequest is used for audit parameters in a transaction request. This is an abstract request class that is extended by the BaseRequest class.
 * <p>Usage
 * AuditParamsRequest is an abstract class that holds attributes related to audit parameters such as email, IP address, MAC address, and phone number. This class can't be instantiated on its own. All CommercePayments request classes extend this class.
 */
global abstract with sharing class AuditParamsRequest implements commercepayments.PaymentGatewayRequest {
    /**
     * Email of the client that initiated the request.
     * <p>String
     */
    global String email { get; set; }
    /**
     * The customer’s IP address. Gateways often use this data in risk checks.
     * <p>String
     */
    global String ipAddress { get; set; }
    /**
     * Mac address of the customer’s device. Gateways often use this data in risk checks.
     * <p>String
     */
    global String macAddress { get; set; }
    /**
     * Phone number of the client that initiated the request.
     * <p>String
     */
    global String phone { get; set; }

    /**
     * This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global Object AuditParamsRequest(String email, String ipAddress, String macAddress, String phone) { return null; }

    global virtual Boolean equals(Object obj) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}