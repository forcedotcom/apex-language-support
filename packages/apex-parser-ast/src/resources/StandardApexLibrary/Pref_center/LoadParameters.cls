/**
 * Contains methods to retrieve record Id information for parameters passed into the load-form handler.
 * <p>Example
 * String userId = loadParams.getRecordId();
 *
 * User user = [select id, AboutMe from User where id=:userId];
 */
global class LoadParameters {
    global Object LoadParameters() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the untokenized version of the record Id.
     */
    global String getRecordId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}