global class EncryptedPaymentData {
    @InvocableVariable
    global String data;
    @InvocableVariable
    global RichMessaging.EncryptedPaymentDataHeader header;
    @InvocableVariable
    global String signature;
    @InvocableVariable
    global String version;

    global EncryptedPaymentData(RichMessaging.EncryptedPaymentDataHeader header, String data, String signature, String version) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}