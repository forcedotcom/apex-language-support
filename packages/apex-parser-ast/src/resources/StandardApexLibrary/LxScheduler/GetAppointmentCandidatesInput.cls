/**
 * Contains information about the available service resources (appointment candidates) based on work type group and service territories.
 * <p>Set up Salesforce Scheduler before making requests. This setup includes creating or configuring Service Resources, Service Territory Members, Work Type Groups, Work Types, Work Type Group Members, and Service Territory Work Types. See <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.ls_set_up.htm&amp;type=5&amp;language=en_US" target="_blank" title="HTML (New Window)">Set Up Salesforce Scheduler</a> for more information.
 * The appointment time slots are determined based on multiple factors, such as field values, scheduled appointments, absences, Scheduler Settings, and Scheduling Policies to determine available time slots. See <a class="xref" href="https://help.salesforce.com/s/articleView?id=platform.ls_how_are_time_slots_determined.htm&amp;type=5&amp;language=en_US" target="_blank" title="HTML (New Window)">How Salesforce Scheduler Determines Available Time Slots</a> for more information.
 * <p>The following factors are considered for returning start time and end time of resources.
 * Resource Availability
 * Determined using service territory member, service territory, work type, and account operating hours fields.
 * Resource Unavailability
 * Determined by resource absences, existing appointments that the resource is assigned to. The resource must be marked as a required resource for the appointment with a status that isn’t in closed, canceled, or completed.
 * Appointment Start Time Interval in the Scheduling Policy
 * Appointment start time interval field in the Scheduling Policy is used to determine when the appointment can start. This interval can be 5, 10, 15, 20, 30, or 60. By default, it’s set to 15.
 * Work Type Duration
 * The end time is calculated as start time + duration of the work type.
 * Note
 * If asset scheduling is enabled, the response also includes asset-based candidates.
 * <p>Usage
 * The constructor for this class can’t be called directly. Create an instance of this class using the GetAppointmentCandidatesInputBuilder.build() method.
 * <p>This example shows how to get a list of available appointment candidates based on workTypeGroupId:
 * //Build input for GetAppointmentCandidates API
 *    lxscheduler.GetAppointmentCandidatesInput input = new lxscheduler.GetAppointmentCandidatesInputBuilder()
 *      .setWorkTypeGroupId('0VSRM0000000ABc4AM')
 *      .setTerritoryIds(new List<String>{'0HhRM0000000FXd0AM'})
 *      .setStartTime(System.now().format('yyyy-MM-dd\'T\'HH:mm:ssZ','America/New_York'))
 *      .setEndTime(System.now().addDays(5).format('yyyy-MM-dd\'T\'HH:mm:ssZ','America/New_York'))
 *      .setAccountId('001RM0000053iQgYAI')
 *      .setSchedulingPolicyId('0VrRM00000000Bx')
 *      .setApiVersion(Double.valueOf('50.0'))
 *      .build();
 *
 *    String response = lxscheduler.SchedulerResources.getAppointmentCandidates(input);
 * This example shows how to get a list of available appointment candidates based on workType:
 * //Build WorkType
 *    lxscheduler.WorkType workType = new lxscheduler.WorkTypeBuilder()
 *      .setId('08qRM0000000G9RYAU')
 *      .build();
 *
 *    lxscheduler.GetAppointmentCandidatesInput input = new lxscheduler.GetAppointmentCandidatesInputBuilder()
 *      .setWorkType(workType)
 *      .setTerritoryIds(new List<String>{'0HhRM0000000FXd0AM'})
 *      .setStartTime(System.now().format('yyyy-MM-dd\'T\'HH:mm:ssZ','America/New_York'))
 *      .setEndTime(System.now().addDays(5).format('yyyy-MM-dd\'T\'HH:mm:ssZ','America/New_York'))
 *      .setAccountId('001RM0000053iQgYAI')
 *      .setSchedulingPolicyId('0VrRM00000000Bx')
 *      .setApiVersion(Double.valueOf('50.0'))
 *      .build();
 *
 *    String response = lxscheduler.SchedulerResources.getAppointmentCandidates(input);
 * This example shows how to get a list of available candidate appointments based on durationInMinutes and without the workTypeGroupId or workType fields:
 * Important
 * When you're using shifts: You must specify workTypeGroupId or the ID of the work type. When you specify the ID of the work type, all other Builder parameters are optional and Scheduler retrieves their values from the database.
 * When you're using operating hours: You don't need to specify workTypeGroupId or the ID of the work type. Scheduler applies durationInMinutes and all other builder parameters as you configure them.
 * //Build SkillRequirement
 *    lxscheduler.SkillRequirement skillReq = new lxscheduler.SkillRequirementBuilder()
 *      .setSkillId('0C5RM0000004EZS0A2')
 *      .setSkillLevel(90)
 *      .build();
 *
 * //Build WorkType
 *    lxscheduler.WorkType workType = new lxscheduler.WorkTypeBuilder()
 *      .setDurationInMinutes(15)
 *      .setBlockTimeBeforeAppointmentInMinutes(5)
 *      .setBlockTimeAfterAppointmentInMinutes(5)
 *      .setTimeFrameStartInMinutes(10080)
 *      .setTimeFrameEndInMinutes(40320)
 *      .setOperatingHoursId('0OHRM0000000FmG4AU')
 *      .setSkillRequirements(new List<lxscheduler.SkillRequirement>{skillReq})
 *      .build();
 *
 *    lxscheduler.GetAppointmentCandidatesInput input = new lxscheduler.GetAppointmentCandidatesInputBuilder()
 *      .setWorkType(workType)
 *      .setTerritoryIds(new List<String>{'0HhRM0000000FXd0AM'})
 *      .setSchedulingPolicyId('0VrRM00000000Bx')
 *      .setApiVersion(Double.valueOf('50.0'))
 *      .build();
 *
 *    String response = lxscheduler.SchedulerResources.getAppointmentCandidates(input);
 * <p>This example shows a sample response of a list of available candidates:
 * [
 *    {
 *       "startTime": "2021-02-16T16:15:00.000+0000",
 *       "endTime": "2021-02-16T16:16:00.000+0000",
 *       "resources": [
 *          "0Hnxx0000004C9BCAU"
 *       ],
 *       "territoryId": "0Hhxx0000004C92CAE"
 *    },
 *    {
 *       "startTime": "2021-02-16T16:30:00.000+0000",
 *       "endTime": "2021-02-16T16:31:00.000+0000",
 *       "resources": [
 *         "0Hnxx0000004C9BCAU"
 *       ],
 *       "territoryId": "0Hhxx0000004C92CAE"
 *    },
 * ]
 */
global without sharing class GetAppointmentCandidatesInput {
    global Object GetAppointmentCandidatesInput() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}