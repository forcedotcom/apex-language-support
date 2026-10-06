/**
 * Provides methods for writing messages to monitor outbound user provisioning requests.
 * Example
 * This example writes the user account information sent to a third-party system for a provisioning request to the UserProvisioningLog object.
 * String inputParamsStr = 'Input parameters: uprId=' + uprId + ',
 * endpointURL=' + endpointURL + ', adminUsername=' + adminUsername + ',
 * email=' + email + ', username=' + username + ', defaultPassword=' + defaultPassword + ',
 * defaultRoles =' + defaultRoles;
 * UserProvisioning.UserProvisioningLog.log(uprId, inputParamsStr);
 */
global class UserProvisioningLog {
    global UserProvisioningLog() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Writes a specific message, such as an error message, to monitor the progress of a user provisioning request.
     */
    global static void log(String userProvisioningRequestId, String details) { }

    /**
     * Writes a specific status and message, such a status and detailed error message, to monitor the progress of a user provisioning request.
     */
    global static void log(String userProvisioningRequestId, String status, String details) { }

    /**
     * Writes a specific message, such as an error message, to monitor the progress of a user provisioning request associated with a specific user.
     */
    global static void log(String userProvisioningRequestId, String externalUserId, String externalUserName, String userId, String details) { }

    global override virtual String toString() { return null; }
}