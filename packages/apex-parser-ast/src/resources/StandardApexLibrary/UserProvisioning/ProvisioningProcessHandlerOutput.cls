global class ProvisioningProcessHandlerOutput {
    global webservice String UPAStatus;
    global webservice String details;
    global webservice String externalEmail;
    global webservice String externalFirstName;
    global webservice String externalLastName;
    global webservice String externalUserId;
    global webservice String externalUsername;
    global webservice String nextReconOffset;
    global webservice String reconState;
    global webservice String status;

    global ProvisioningProcessHandlerOutput() { }

    global ProvisioningProcessHandlerOutput(String status, String details, String externalUserId, String externalUsername, String externalEmail, String externalFirstName, String externalLastName, String UPAStatus, String nextReconOffset) { }

    global virtual Boolean equals(Object o) { return false; }

    global String getDetails() { return null; }

    global String getExternalEmail() { return null; }

    global String getExternalFirstName() { return null; }

    global String getExternalLastName() { return null; }

    global String getExternalUserId() { return null; }

    global String getExternalUsername() { return null; }

    global String getNextReconOffset() { return null; }

    global String getReconState() { return null; }

    global String getStatus() { return null; }

    global String getUPAStatus() { return null; }

    global virtual Integer hashCode() { return 0; }

    global void setDetails(String details) { }

    global void setExternalEmail(String externalEmail) { }

    global void setExternalFirstName(String externalFirstName) { }

    global void setExternalLastName(String externalLastName) { }

    global void setExternalUserId(String externalUserId) { }

    global void setExternalUsername(String externalUsername) { }

    global void setNextReconOffset(String nextReconOffset) { }

    global void setReconState(String reconState) { }

    global void setStatus(String status) { }

    global void setUPAStatus(String UPAStatus) { }

    global override virtual String toString() { return null; }
}