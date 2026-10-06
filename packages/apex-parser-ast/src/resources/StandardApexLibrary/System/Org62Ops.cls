global class Org62Ops {
    global Org62Ops() { }

    global virtual Boolean equals(Object o) { return false; }

    global static String executeUsingInternalRestService(String targetOrgId, String url) { return null; }

    global static String executeUsingInternalRestServiceWithCase(String targetOrgId, String url, String caseId) { return null; }

    global static String generateBTUrlForOrg(Id caseId, Id orgId, String landingUrl) { return null; }

    global static String getOrganizationInstanceName(Id orgId) { return null; }

    global static String getOrganizationInstanceType(Id orgId) { return null; }

    global static String getSfdcBtLoginUrl(String caseId, String landingUrl) { return null; }

    global static String getTokenForDataRestoreExcludingFFX(Id orgId, String caseNumber, String username) { return null; }

    global static String getTokenForDataRestoreIncludingFFX(Id orgId, String caseNumber, String username) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}