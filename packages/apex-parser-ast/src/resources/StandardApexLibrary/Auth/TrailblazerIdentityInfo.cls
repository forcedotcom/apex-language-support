global class TrailblazerIdentityInfo {
    global Object TrailblazerIdentityInfo() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global static Auth.TrailblazerIdentityAdditionalInfo getAdditionalUserInfo(String orgId, String userId) { return null; }

    global static List getAdditionalUserInfos(List orgIds, List userIds) { return null; }

    global static String getMyDomain(String orgId) { return null; }

    global static List getTpalsByHandlesAndProviderIds(List handles, List ssoProviderIds) { return null; }

    global static List getTpalsByIds(List ids) { return null; }

    global static List getTpalsByRemoteIdsAndProviderIds(List remoteIdentifiers, List ssoProviderIds) { return null; }

    global static List getTpalsByUserIdAndProviderIds(String userId, List ssoProviderIds) { return null; }

    global static List getTpalsByUserIdsAndProviderIds(List userIds, List ssoProviderIds) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}