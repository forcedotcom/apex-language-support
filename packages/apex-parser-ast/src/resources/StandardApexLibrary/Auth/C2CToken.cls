global class C2CToken {
    global Object C2CToken() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global static String mintJwt(String audienceId) { return null; }

    global static String mintJwt(String audienceId, String integrationName) { return null; }

    global static String mintJwtForService(String audienceId, String integrationName) { return null; }

    global static String mintJwtForService(String audienceId, String integrationName, Map customClaims) { return null; }

    global override virtual String toString() { return null; }
}