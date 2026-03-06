/**
 * Target to create.
 */
global class TargetInput {

  /**
   * ID of the audience to assign to the target.
   */
  global String audienceId;

  /**
   * Group name of the target. Groups bundle related target and audience pairs. You can have up to 2,000 groups and 500 targets per group. To determine the group name for targets of type ExperienceVariation , see Personalization Target Developer and Group Names in the Experience Cloud Developer Guide .
   */
  global String groupName;

  /**
   * Priority of the target. Within a group, priority determines which target is returned if the user matches more than one audience.
   */
  global Integer priority;

  /**
   * The publish status of the target. Values are: Draft Live We recommend setting the publish status to Draft . If you specify Live , your changes revert after you publish the site.
   */
  global ConnectApi.PublishStatus publishStatus;

  /**
   * Type of target, indicating the nature of the data being targeted. Supported values include: ExperienceVariation (version 48.0 and later) Custom object API names, such as CustomObjectName __c (version 48.0 and later) NavigationLinkSet (version 49.0 and later) Topic (version 49.0 and later) CollaborationGroup (version 49.0 and later) KnowledgeArticle (version 49.0 and later) ContentDocument (version 49.0 and later) ManagedContent (version 49.0 and later) Report (version 49.0 and later) Dashboard (version 49.0 and later) You can have up to 2,500 ExperienceVariation targets and 25,000 record targets.
   */
  global String targetType;

  /**
   * Value of the target. If targetType is ExperienceVariation , targetValue is the developer name of the experience variation. If targetType is CustomObjectName __c , targetValue is the ID of the custom object. To determine the developer name for targets of type ExperienceVariation , see Personalization Target Developer and Group Names in the Experience Cloud Developer Guide .
   */
  global String targetValue;

}