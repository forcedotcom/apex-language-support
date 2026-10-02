/**
 * Represents the list of parameters that are passed to the ServiceResourceScheduleHandler interface. This class is implemented internally by Apex.
 */
global with sharing class ServiceAppointmentRequestInfo {
    /**
     * Creates a new instance of the lxscheduler.ServiceAppointmentRequestInfo class using the specified start date, end date, service resources, scheduling policy, work type group, accound ID, primary resource, work type, and correlation.
     */
    global Object ServiceAppointmentRequestInfo(Datetime startDate, Datetime endDate, List ServiceResources, String SchedulingPolicyId, String workTypeGroupId, String accountId, String primaryResourceId, String workTypeId, String correlationId) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the account ID of the customer if the API request contains one.
     */
    global String getAccountId() { return null; }

    /**
     * Returns a unique identifier for a request.
     */
    global String getCorrelationId() { return null; }

    /**
     * Returns the end date and time for which unavailable time slots are requested.
     */
    global Datetime getEndDate() { return null; }

    /**
     * Returns the ID of the primary service resource.
     */
    global String getPrimaryResourceId() { return null; }

    /**
     * Returns the ID of the scheduling policy that the API request contains.
     */
    global String getSchedulingPolicyId() { return null; }

    /**
     * Returns the list of requested service resources for the unavailable time slots.
     */
    global List getServiceResources() { return null; }

    /**
     * Returns the start date and time for which unavailable time slots are requested.
     */
    global Datetime getStartDate() { return null; }

    /**
     * Returns the work type group ID if the API request contains one.
     */
    global String getWorkTypeGroupId() { return null; }

    /**
     * Returns the work type ID if the API request contains one.
     */
    global String getWorkTypeId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}