/**
 * Access information about custom metadata. The PaymentGatewayAdapter can send CustomMetadataTypeInfo to transaction requests through the response object’s SalesforceResultCodeInfo.
 */
global with sharing class CustomMetadataTypeInfo {
    /**
     * Constructor for providing custom metadata type information.
     */
    global CustomMetadataTypeInfo(String cmtRecordId, String cmtSfResultCodeFieldName) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}