/**
 * Contains information about the available appointment time slots for a resource based on given work type group and territories.
 * <p>The appointment time slots are determined based on your Salesforce Scheduler data model configurations. Here are some prerequisites that you can consider while setting up data.
 * Set up Salesforce Scheduler before making your requests. The setup includes creating or configuring Service Resources, Service Territory Members, Work Type Groups, Work Types, Work Type Group Members, and Service Territory Work Types. See <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.ls_set_up.htm&amp;language=en_US" target="_blank">Manage Business Information in Salesforce Scheduler</a> for more information.
 * Configure a work type mapped for each territory in the request body via Service Territory Work Type. Map the same work type to the work type group, via work type group member.
 * <p>The following factors affect how time slots are calculated and returned.
 * Timezones that differ across operating hours are handled and results are always returned in UTC.
 * The resource must be marked as a required resource on the assigned resource object.
 * The resource is considered unavailable If the status categories of the resource assigned to service appointments are other than Canceled, Cannot Complete, and Completed.
 * Resource Absences of all types are considered unavailable from start to end.
 * The following fields of Work Type records, if configured, are used to fine-tune time slot requirements. For more information, see <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.ls_create_work_types.htm&amp;language=en_US" target="_blank">Create Work Types in Salesforce Scheduler</a>.
 * Parameter Description
 * Timeframe Start Time slots sooner than current time + Timeframe Start aren’t returned.
 * Timeframe End Time slots later than current time + Timeframe End aren’t returned.
 * Block Time Before Appointment The time period before the appointment is considered as unavailable.
 * Block Time After Appointment The time period after the appointment is considered as unavailable.
 * Operating Hours The overlap of all operating hours from the account, work type, service territory, and service territory member are considered while determining time slots. For more information, see <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.ls_set_up_oh.htm&amp;type=5&amp;language=en_US" target="_blank">Set Up Operating Hours in Salesforce Scheduler</a>.
 * Only the time slots within the period of 31 days from the start date are returned.
 * Salesforce Scheduler uses multiple factors, such as field values, scheduled appointments, absences, Scheduler Settings, and Scheduling Policies to determine available time slots, including the earliest and latest appointment slots. See <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.ls_how_are_time_slots_determined.htm&amp;type=5&amp;language=en_US" target="_blank" title="HTML (New Window)">How Does Salesforce Scheduler Determine Available Time Slots</a>.
 * Note
 * If asset scheduling is enabled, you can provide an asset-based service resource in requiredResourceIds to retrieve available timeslots for the asset resource.
 * <p>Usage
 * The constructor for this class can’t be called directly. Create an instance of this class using the GetAppointmentSlotsInputBuilder.build() method.
 * <p>This example shows how to get a list of available time slots based on workTypeGroupId:
 * //Build input for GetAppointmentSlots API
 *    lxscheduler.GetAppointmentSlotsInput input = new lxscheduler.GetAppointmentSlotsInputBuilder()
 *       .setWorkTypeGroupId('0VSxx0000004C92GAE')
 *       .setTerritoryIds(new List<String>{'0Hhxx0000004C92CAE'})
 *       .setStartTime(System.now().format('yyyy-MM-dd\'T\'HH:mm:ssZ'))
 *       .setEndTime(System.now().addDays(1).format('yyyy-MM-dd\'T\'HH:mm:ssZ'))
 *       .setAccountId('001xx000003GYK0AAO')
 *       .setRequiredResourceIds(new List<String>{'0Hnxx0000004C92CAE'})
 *       .setSchedulingPolicyId('0Vrxx0000004CAe')
 *       .setApiVersion(Double.valueOf('48.0'))
 *       .build();
 *
 * String response = lxscheduler.SchedulerResources.getAppointmentSlots(input);
 * This example shows how to get a list of available time slots based on workType:
 * //Build WorkType
 *    lxscheduler.WorkType workType = new lxscheduler.WorkTypeBuilder()
 *       .setId('08qxx0000004C92AAE')
 *       .build();
 *
 *    lxscheduler.GetAppointmentSlotsInput input = new lxscheduler.GetAppointmentSlotsInputBuilder()
 *       .setWorkType(workType)
 *       .setTerritoryIds(new List<String>{'0Hhxx0000004C92CAE'})
 *       .setStartTime(System.now().format('yyyy-MM-dd\'T\'HH:mm:ssZ'))
 *       .setEndTime(System.now().addDays(1).format('yyyy-MM-dd\'T\'HH:mm:ssZ'))
 *       .setAccountId('001xx000003GYK0AAO')
 *       .setRequiredResourceIds(new List<String>{'0Hnxx0000004C92CAE'})
 *       .setSchedulingPolicyId('0Vrxx0000004CAe')
 *       .setApiVersion(Double.valueOf('48.0'))
 *       .build();
 *
 * String response = lxscheduler.SchedulerResources.getAppointmentSlots(input);
 * This example shows how to get a list of available time slots based on durationInMinutes and without workTypeGroupId or workType fields:
 * //Build WorkType
 *    lxscheduler.WorkType workType = new lxscheduler.WorkTypeBuilder()
 *       .setDurationInMinutes(60)
 *       .build();
 *
 *    lxscheduler.GetAppointmentSlotsInput input = new lxscheduler.GetAppointmentSlotsInputBuilder()
 *       .setWorkType(workType)
 *       .setTerritoryIds(new List<String>{'0Hhxx0000004C92CAE'})
 *       .setRequiredResourceIds(new List<String>{'0Hnxx0000004C92CAE'})
 *       .setApiVersion(Double.valueOf('48.0'))
 *       .build();
 *
 *    String response = lxscheduler.SchedulerResources.getAppointmentSlots(input);
 * <p>This example shows a sample response of a list of available time slots:
 * [
 *    {
 *      "territoryId": "0Hhxx0000004C92CAE",
 *      "startTime": "2021-02-10T16:00:00.000+0000",
 *      "endTime": "2021-02-10T16:15:00.000+0000",
 *      "remainingAppointments": 1
 *    },
 *    {
 *      "territoryId": "0Hhxx0000004C92CAE",
 *      "startTime": "2021-02-10T16:15:00.000+0000",
 *      "endTime": "2021-02-10T16:30:00.000+0000",
 *      "remainingAppointments": 1
 *    },
 * ]
 */
global without sharing class GetAppointmentSlotsInput {
    global Object GetAppointmentSlotsInput() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}