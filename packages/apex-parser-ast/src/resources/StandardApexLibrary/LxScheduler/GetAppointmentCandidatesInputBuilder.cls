/**
 * Contains methods to build an instance of the lxscheduler.GetAppointmentCandidatesInput class.
 * A Builder object is obtained by invoking one of the GetAppointmentCandidatesInputBuilder methods defined by the GetAppointmentCandidatesInput class.
 */
global without sharing class GetAppointmentCandidatesInputBuilder {
    global GetAppointmentCandidatesInputBuilder() { }

    /**
     * Returns an instance of the lxscheduler.GetAppointmentCandidatesInput object.
     */
    global lxscheduler.GetAppointmentCandidatesInput build() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the ID of the associated account for which you want to create the appointments.
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setAccountId(String accountId) { return null; }

    /**
     * Allows the scheduling of concurrent appointments.
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setAllowConcurrent(Boolean allowConcurrent) { return null; }

    /**
     * Sets the API version of the business logic for the getAppointmentCandidates method.
     * Usage
     * The specified parameter must use the correct API version. For example, if API version is set to 45.0 and filterByResources is set (which is available in API version 51.0 and later), then this field is ignored. If no API version or incorrect API version is passed in the request body, by default the latest version is used.
     * Note
     * The API is available since version 45.0.
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setApiVersion(Double apiVersion) { return null; }

    /**
     * Sets the correlation ID.
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setCorrelationId(String correlationId) { return null; }

    /**
     * Sets the scheduling end time.
     * Usage
     * The specified string should use the standard date format “['yyyy-MM-dd\’T\’HH:mm:ssZ']” in the local time zone. Defaults to the user’s time zone.
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setEndTime(String endTime) { return null; }

    /**
     * Sets an engagement channel type.
     * Usage
     * You can use engagement channel types only in these cases:
     * The Schedule Appointments Using Engagement Channels setting is enabled in Salesforce Scheduler Settings in your Salesforce org.
     * Shifts are defined in the scheduling policy. For more information on setting up shifts in scheduling policy, see <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.ls_use_shifts_to_determine_time_slots.htm&amp;type=5&amp;language=en_US" target="_blank" title="HTML (New Window)">Define Shift Rules in Scheduling Policy</a>.
     * Note
     * Engagement channel types are not supported with operating-hours rules in the scheduling policy.
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setEngagementChannelTypeIds(List engagementChannelTypeIds) { return null; }

    /**
     * Enables filtering resources using a comma-separated list of service resource IDs.
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setFilterByResources(List filterByResources) { return null; }

    /**
     * Sets the number of service resources to show during appointment scheduling.
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setResourceLimitApptDistribution(Integer resourceLimitApptDistribution) { return null; }

    /**
     * Sets the ID of the AppointmentSchedulingPolicy object.
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setSchedulingPolicyId(String schedulingPolicyId) { return null; }

    /**
     * Sets the scheduling start time to the specified time.
     * Usage
     * The specified string should use the standard date format “['yyyy-MM-dd\’T\’HH:mm:ssZ']” in the local time zone. Defaults to the user’s time zone.
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setStartTime(String startTime) { return null; }

    /**
     * Sets the service territory IDs.
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setTerritoryIds(List territoryIds) { return null; }

    /**
     * Sets the type of work to be performed.
     * Usage
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setWorkType(lxscheduler.WorkType workType) { return null; }

    /**
     * Sets the ID of the work type group.
     */
    global lxscheduler.GetAppointmentCandidatesInputBuilder setWorkTypeGroupId(String workTypeGroupId) { return null; }

    global override virtual String toString() { return null; }
}