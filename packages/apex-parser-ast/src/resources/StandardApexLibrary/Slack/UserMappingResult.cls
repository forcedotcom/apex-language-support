global class UserMappingResult {
    global virtual Boolean equals(Object o) { return false; }

    global Slack.UserProvisioningErrorCode getError() { return null; }

    global Slack.UserMapping getUserMapping() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isSuccess() { return false; }

    global override String toString() { return null; }
}