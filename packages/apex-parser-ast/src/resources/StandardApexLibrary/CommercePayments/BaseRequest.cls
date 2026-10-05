/**
 * BaseRequest is extended by all the request classes.
 */
global abstract with sharing class BaseRequest extends commercepayments.AuditParamsRequest {
    @AuraEnabled
    global Map additionalData { get; set; }
    global Boolean duplicate { get; set; }
    global String email { get; set; }
    global String idempotencyKey { get; set; }
    global String ipAddress { get; set; }
    global String macAddress { get; set; }
    global String phone { get; set; }

    global BaseRequest(Boolean duplicate, String idempotencyKey) { }

    global override virtual Boolean equals(Object obj) { return false; }

    global override virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}