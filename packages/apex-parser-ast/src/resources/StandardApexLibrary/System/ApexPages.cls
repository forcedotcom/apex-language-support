/**
 * Use ApexPages to add and check for messages associated with the current page, as well as to reference the current page.
 * Usage
 * In addition, ApexPages is used as a namespace for the PageReference Class and the Message Class.
 */
global class ApexPages {
    /**
     * Add a message to the current page context.
     */
    global static void addMessage(ApexPages.Message message) { }

    /**
     * Adds a list of messages to the current page context based on a thrown exception.
     */
    global static void addMessages(Exception ex) { }

    /**
     * Returns the current page's PageReference.
     * Example
     * This code segment returns the id parameter of the current page.
     * public MyController() {
     *     account = [
     *         SELECT Id, Name, Site
     *         FROM Account
     *         WHERE Id =
     *             :ApexPages.currentPage().
     *              getParameters().
     *              get('id')
     *     ];
     * }
     */
    global static System.PageReference currentPage() { return null; }

    /**
     * Returns a list of the messages associated with the current context.
     */
    global static List getMessages() { return null; }

    /**
     * Returns true if there are messages associated with the current context, false otherwise.
     */
    global static Boolean hasMessages() { return false; }

    /**
     * Returns true if messages of the specified severity exist, false otherwise.
     */
    global static Boolean hasMessages(ApexPages.Severity severity) { return false; }
}