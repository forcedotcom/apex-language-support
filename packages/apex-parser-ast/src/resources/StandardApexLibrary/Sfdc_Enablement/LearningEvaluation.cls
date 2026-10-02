/**
 * Contains methods to retrieve and update details that are required to evaluate a learning item.
 * <p>Usage
 * Pass this class as input to the sfdc_enablement.LearningEvaluationResult class.
 * <p>Example
 * See example code in sfdc_enablement.LearningItemEvaluationHandler.
 */
global class LearningEvaluation {
    global Object LearningEvaluation(String learningItemId, Map details) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Retrieves the details associated with the learning evaluation instance.
     */
    global Map getDetails() { return null; }

    /**
     * Retrieves the record ID of the learning item that's associated with this learning evaluation instance.
     */
    global String getLearningItemId() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets or updates the details of the learning item record for this learning evaluation instance.
     */
    global void setDetails(Map details) { }

    /**
     * Sets or updates the learning item record ID for this learning evaluation instance.
     */
    global void setLearningItemId(String learningItemId) { }

    global override virtual String toString() { return null; }
}