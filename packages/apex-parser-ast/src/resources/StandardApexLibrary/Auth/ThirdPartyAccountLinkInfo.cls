global class ThirdPartyAccountLinkInfo {
    global String handle { get; set; }
    global String id { get; set; }
    global Boolean isNotSsoUsable { get; set; }
    global String provider { get; set; }
    global String remoteIdentifier { get; set; }
    global String ssoProviderId { get; set; }
    global String ssoProviderName { get; set; }
    global String thirdPartyAccountLinkKey { get; set; }
    global String userId { get; set; }

    global ThirdPartyAccountLinkInfo(String oHandle, String oRemoteIdentifier, String oUserId, String oSsoProviderId) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}