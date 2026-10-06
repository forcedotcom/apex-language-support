/**
 * Contains methods to customize the evaluation process of a learning item.
 * Usage
 * Extend this class and implement your custom progress evaluation method. Then link this class to a <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_learningitemtype.htm" target="_blank">LearningItemType metadata</a> record by passing the Apex class name to the ApexEvaluationHandler field.
 * Example
 * This code updates a user’s progress when they take a custom screen flow exercise in an Enablement program. The code updates the progress by checking the number of screens the user has navigated, calculating the progress percentage, and returning the progress status. See <a class="xref" href="https://developer.salesforce.com/docs/sales/enablement/guide/custom-exercise-track-progress.html" target="_blank">Track a User's Progress in a Custom Exercise</a> from Salesforce Developer Guide: Sales Programs and Partner Tracks with Enablement.
 * global class ScreenFlowEvaluationHandler extends sfdc_enablement.LearningItemEvaluationHandler {
 *     global override sfdc_enablement.LearningEvaluationResult evaluate(sfdc_enablement.LearningEvaluation learningEvaluation) {
 *         sfdc_enablement.LearningEvaluationResult result = new sfdc_enablement.LearningEvaluationResult();
 *         Double percentage = 100.0d;
 *
 *         Map<String, Object> details = learningEvaluation.getDetails();
 *
 *         String currentScreen = (String) details.get('currentScreen');
 *
 *         String allScreensString = (String) details.get('allScreens');
 *         List<String> allScreens = allScreensString.split(',');
 *
 *         String status = (String) details.get('status');
 *         if (status == 'FINISHED') {
 *             percentage = 100;
 *         } else {
 *             Integer index = 0;
 *             for (Integer i = 0; i < allScreens.size(); i++) {
 *                 if (allScreens.get(i).equals(currentScreen)) {
 *                     index = i + 1;
 *                     break;
 *                 }
 *             }
 *
 *             if (index == allScreens.size()) {
 *                 percentage = 99.0d;
 *             } else {
 *                 percentage = (Double.valueOf(index) / Double.valueOf(allScreens.size())) * 100.0d;
 *             }
 *         }
 *
 *         result.setLearningItemProgress(percentage);
 *
 *         if (percentage == 100.0d) {
 *             result.setLearningItemProgressStatus(sfdc_enablement.LearningItemProgressStatus.Completed);
 *         } else if (percentage == 0.0d) {
 *             result.setLearningItemProgressStatus(sfdc_enablement.LearningItemProgressStatus.NotStarted);
 *         } else {
 *             result.setLearningItemProgressStatus(sfdc_enablement.LearningItemProgressStatus.InProgress);
 *         }
 *
 *         return result;
 *     }
 * }
 */
global abstract class LearningItemEvaluationHandler {
    global LearningItemEvaluationHandler() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Contains the custom logic for evaluating a learning item.
     * @return The result of the evaluation, including progress and status details.
     */
    global abstract sfdc_enablement.LearningEvaluationResult evaluate(sfdc_enablement.LearningEvaluation learningEvaluation);

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}