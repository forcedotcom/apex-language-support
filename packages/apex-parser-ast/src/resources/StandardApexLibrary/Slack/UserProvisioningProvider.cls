global class UserProvisioningProvider {
    global UserProvisioningProvider() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global static Slack.UserProvisioningResult importUsers(List proposedUserMappings, String installedAppContextId) { return null; }

    global static Slack.UserProvisioningResult revokeUsersBySalesforceId(List salesforceIdsToRevoke, String installedAppContextId) { return null; }

    global static Slack.UserProvisioningResult revokeUsersBySlackId(List slackIdsToRevoke) { return null; }

    global override virtual String toString() { return null; }
}