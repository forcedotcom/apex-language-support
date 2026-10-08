/**
 * Retrieve record ID information to use with your submit-form handler.
 * Example
 * String userId = submitParams.getRecordId();
 *
 * User user = [select id, AboutMe from User where id=:userId];
 */
global class SubmitParameters {
    global SubmitParameters() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the untokenized version of the record ID.
     */
    global String getRecordId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}