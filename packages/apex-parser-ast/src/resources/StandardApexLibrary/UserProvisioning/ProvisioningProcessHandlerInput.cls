global class ProvisioningProcessHandlerInput {
    global webservice String namedCredDevName;
    global webservice String reconFilter;
    global webservice String reconOffset;
    global webservice String userId;
    global webservice String userProvisioningRequestId;

    global ProvisioningProcessHandlerInput(String userProvisioningRequestId, String userId, String namedCredDevName, String reconFilter, String reconOffset) { }

    global virtual Boolean equals(Object o) { return false; }

    global String getNamedCredDevName() { return null; }

    global String getReconFilter() { return null; }

    global String getReconOffset() { return null; }

    global String getUserId() { return null; }

    global String getUserProvisioningRequestId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setNamedCredDevName(String namedCredDevName) { }

    global void setReconFilter(String reconFilter) { }

    global void setReconOffset(String reconOffset) { }

    global void setUserId(String userId) { }

    global void setUserProvisioningRequestId(String userProvisioningRequestId) { }

    global override virtual String toString() { return null; }
}