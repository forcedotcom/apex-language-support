/**
 * Contains methods to help with AppExchange App Analytics use cases, such as minimizing subscriber attrition and obtaining product insights.
 * <p>Usage
 * Use AppAnalytics and its methods to log App Analytics custom interactions.
 * <p>Example
 * public void submitClicked() {
 *         Id jobId = System.enqueueJob(new MyQueueable(colorValue));
 *         IsvPartners.AppAnalytics.logCustomInteraction(
 *              MyPageInteractions.SUBMIT_CLICKED, jobId);
 */
global class AppAnalytics {
    global Object AppAnalytics() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Logs the custom interaction using a label that you provide as an enum value.
     */
    global static void logCustomInteraction(Object interactionLabel) { }

    /**
     * Logs the custom interaction using a label that you provide as an enum value and an interaction ID.
     */
    global static void logCustomInteraction(Object interactionLabel, Id interactionId) { }

    /**
     * Logs the custom interaction using a label that you provide as an enum value and an interaction ID that you provide as an Apex UUID.
     */
    global static void logCustomInteraction(Object interactionLabel, System.UUID interactionUuid) { }

    global override virtual String toString() { return null; }
}