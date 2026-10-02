global class EncryptedPaymentDataHeader {
    @InvocableVariable
    global String applicationData;
    @InvocableVariable
    global String ephemeralPublicKey;
    @InvocableVariable
    global String publicKeyHash;
    @InvocableVariable
    global String transactionId;

    global Object EncryptedPaymentDataHeader(String transactionId, String publicKeyHash, String ephemeralPublicKey, String applicationData) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}