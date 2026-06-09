/**
 * Contains methods to help with AppExchange App Analytics use cases, such as minimizing subscriber attrition and obtaining product insights.
 */
global class AppAnalytics {

  global AppAnalytics() {}

  global static void logCustomInteraction(Object interactionLabel, Id interactionId) {}

  global static void logCustomInteraction(Object interactionLabel, System.UUID interactionUuid) {}

  global static void logCustomInteraction(Object interactionLabel) {}

  global Object clone() {}

}