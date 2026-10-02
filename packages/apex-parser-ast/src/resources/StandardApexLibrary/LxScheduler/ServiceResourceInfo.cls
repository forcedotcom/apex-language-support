/**
 * Contains information about a service resource.
 */
global with sharing class ServiceResourceInfo {
    /**
     * Creates a new instance of the lxscheduler.ServiceResourceInfo class using the specified service resource details.
     */
    global Object ServiceResourceInfo(String userId, String userName, String email, String serviceResourceId, List territoryIds, String resourceType) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the email ID of the service resource.
     */
    global String getEmail() { return null; }

    /**
     * Returns the type of the service resource such as Technician or Asset.
     */
    global String getResourceType() { return null; }

    /**
     * Returns the ID of the service resource.
     */
    global String getServiceResourceId() { return null; }

    /**
     * Returns a list of requested service territories for the service resource.
     */
    global List getTerritoryIds() { return null; }

    /**
     * Returns the user ID of the service resource.
     */
    global String getUserId() { return null; }

    /**
     * Returns the user name of the service resource.
     */
    global String getUserName() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}