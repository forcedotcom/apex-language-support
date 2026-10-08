global class UserOrgInfo {
    global String email { get; set; }
    global Boolean isActive { get; set; }
    global String myDomain { get; set; }
    global String orgId { get; set; }
    global String orgName { get; set; }
    global String organizationType { get; set; }
    global String status { get; set; }
    global String tenantTier { get; set; }
    global String userId { get; set; }
    global String userName { get; set; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}