global with sharing class ClientResponse {
    global Object ClientResponse(String token, Map response) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global String getGatewayToken() { return null; }

    global Map getResponseBody() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setGatewayToken(String token) { }

    global void setResponseBody(Map response) { }

    global override virtual String toString() { return null; }
}