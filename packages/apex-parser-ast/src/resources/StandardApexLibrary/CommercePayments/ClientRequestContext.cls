global with sharing class ClientRequestContext {
    global virtual Boolean equals(Object o) { return false; }

    global Decimal getAmount() { return 0.0; }

    global String getCurrencyCode() { return null; }

    global String getGatewayToken() { return null; }

    global String getIdempotencyKey() { return null; }

    global String getPaymentGatewayId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}