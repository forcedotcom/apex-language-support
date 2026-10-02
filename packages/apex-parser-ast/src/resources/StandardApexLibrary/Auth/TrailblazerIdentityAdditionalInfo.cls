global class TrailblazerIdentityAdditionalInfo {
    global String isOrgActive { get; set; }
    global String isUserActive { get; set; }
    global String orgId { get; set; }
    global String orgStatus { get; set; }
    global String orgType { get; set; }
    global String userId { get; set; }
    global String userType { get; set; }

    global Object TrailblazerIdentityAdditionalInfo(String oStatus, String oActive, String oType, String oId, String uActive, String uId, String uType) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}