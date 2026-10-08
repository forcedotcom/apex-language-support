global class TrailblazerIdentity {
    global TrailblazerIdentity() { }

    global virtual Boolean equals(Object o) { return false; }

    global static String generateUserEmailVerificationToken(String orgId, String userId, String email) { return null; }

    global static List getUserOrgInfo(List emailList) { return null; }

    global virtual Integer hashCode() { return 0; }

    global static void splunkLog(String source, String message) { }

    global override virtual String toString() { return null; }
}