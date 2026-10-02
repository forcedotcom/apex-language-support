global class UserProvisioningResult {
    global virtual Boolean equals(Object o) { return false; }

    global List getFailedMappings() { return null; }

    global List getSuccessfulMappings() { return null; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isSuccess() { return false; }

    global override String toString() { return null; }
}