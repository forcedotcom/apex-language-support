/**
 * Contains methods to build an instance of the lxscheduler.GetAppointmentSlotsInput class.
 * <p>A Builder object is obtained by invoking one of the GetAppointmentSlotsInputBuilder methods defined by the GetAppointmentSlotsInput class.
 */
global class GetAppointmentSlotsInputBuilder {
    global GetAppointmentSlotsInputBuilder() { }

    /**
     * Returns an instance of the lxscheduler.GetAppointmentSlotsInput object.
     */
    global lxscheduler.GetAppointmentSlotsInput build() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the ID of the associated account for which you want to create appointments.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setAccountId(String accountId) { return null; }

    /**
     * Allows the scheduling of concurrent appointments.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setAllowConcurrentScheduling(Boolean allowConcurrentScheduling) { return null; }

    /**
     * Sets the API version of the business logic for the getAppointmentSlots method.
     * <p>Usage
     * The specified parameter must use the correct API version. For example, if API version is set to 45.0 and primaryResourceId is set (which is available in API version 48.0 and later), then this field is ignored. If no API version or incorrect API version is passed in the request body, by default the latest version is used.
     * Note
     * The API is available since version 45.0.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setApiVersion(Double apiVersion) { return null; }

    /**
     * Sets the correlation ID.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setCorrelationId(String correlationId) { return null; }

    /**
     * Sets the scheduling end time.
     * <p>Usage
     * The specified string should use the standard date format “['yyyy-MM-dd\’T\’HH:mm:ssZ']” in the local time zone. Defaults to the user’s time zone.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setEndTime(String endTime) { return null; }

    /**
     * Sets an engagement channel type.
     * <p>Usage
     * You can use engagement channel types only in these cases:
     * The Schedule Appointments Using Engagement Channels setting is enabled in Salesforce Scheduler Settings in your Salesforce org.
     * Shifts are defined in the scheduling policy. For more information on setting up shifts in scheduling policy, see <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.ls_use_shifts_to_determine_time_slots.htm&amp;type=5&amp;language=en_US" target="_blank" title="HTML (New Window)">Define Shift Rules in Scheduling Policy</a>.
     * Note
     * Engagement channel types are not supported with operating-hours rules in the scheduling policy.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setEngagementChannelTypeIds(List engagementChannelTypeIds) { return null; }

    /**
     * Sets the ID of the primary resource.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setPrimaryResourceId(String primaryResourceId) { return null; }

    /**
     * Sets the resource IDs.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setRequiredResourceIds(List requiredResourceIds) { return null; }

    /**
     * Sets the ID of the AppointmentSchedulingPolicy object.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setSchedulingPolicyId(String schedulingPolicyId) { return null; }

    /**
     * Sets the scheduling start time.
     * <p>Usage
     * The specified string should use the standard date format “['yyyy-MM-dd\’T\’HH:mm:ssZ']” in the local time zone. Defaults to the user’s time zone.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setStartTime(String startTime) { return null; }

    /**
     * Sets the IDs of service territories.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setTerritoryIds(List territoryIds) { return null; }

    /**
     * Sets the type of work to be performed.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setWorkType(lxscheduler.WorkType workType) { return null; }

    /**
     * Sets the ID of the work type group.
     */
    global lxscheduler.GetAppointmentSlotsInputBuilder setWorkTypeGroupId(String workTypeGroupId) { return null; }

    global override virtual String toString() { return null; }
}