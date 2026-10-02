/**
 * Contains the results for rendering email templates.
 */
global class RenderEmailTemplateBodyResult {
    global List errors { get; }
    global String mergedbody { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * If an error occurred during the renderEmailTemplate method, a RenderEmailTemplateError object is returned.
     */
    global List getErrors() { return null; }

    /**
     * Returns the rendered body text with merge field references replaced with the corresponding record data.
     */
    global String getMergedBody() { return null; }

    /**
     * Indicates whether the operation was successful.
     */
    global Boolean getSuccess() { return false; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}