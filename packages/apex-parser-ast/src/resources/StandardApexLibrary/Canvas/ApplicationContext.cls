/**
 * Use this interface to retrieve application context information, such as the application version or URL.
 * Usage
 * The ApplicationContext interface provides methods to retrieve application information about the canvas app that’s being rendered. Most of the methods are read-only. For this interface, you don’t need to create an implementation. Use the default implementation that Salesforce provides.
 */
global interface ApplicationContext {
    virtual Boolean equals(Object arg0);

    /**
     * Retrieves the fully qualified URL of the canvas app.
     * Usage
     * Use this method to get the URL of the canvas app, for example: http://instance.salesforce.com:8080/canvas_app_path/canvas_app.jsp.
     */
    abstract String getCanvasUrl();

    /**
     * Retrieves the internal API name of the canvas app.
     * Usage
     * Use this method to get the API name of the canvas app. You specify this value in the API Name field when you expose the canvas app by creating a connected app.
     */
    abstract String getDeveloperName();

    /**
     * Retrieves the name of the canvas app.
     * Usage
     * Use this method to get the name of the canvas app.
     */
    abstract String getName();

    /**
     * Retrieves the namespace prefix of the canvas app.
     * Usage
     * Use this method to get the Salesforce namespace prefix that’s associated with the canvas app.
     */
    abstract String getNamespace();

    /**
     * Retrieves the current version of the canvas app.
     * Usage
     * Use this method to get the current version of the canvas app. This value changes after you update and republish a canvas app in an organization. If you are in a Developer Edition organization, using this method always returns the latest version.
     */
    abstract String getVersion();

    virtual Integer hashCode();

    /**
     * Overrides the URL of the canvas app for the current request.
     * Usage
     * Use this method to override the URL path and query string of the canvas app. Do not provide a fully qualified URL, because the provided URL string will be appended to the original canvas URL domain.
     * For example, if the current canvas app URL is https://myserver.com:6000/myAppPath and you call setCanvasUrlPath('/alternatePath/args?arg1=1&arg2=2'), the adjusted canvas app URL will be https://myserver.com:6000/alternatePath/args?arg1=1&arg2=2.
     * If the provided path results in a malformed URL, or a URL that exceeds 2,048 characters, a System.CanvasException will be thrown.
     * This method overrides the canvas app URL for the current request and does not permanently change the canvas app URL as configured in the UI for the Salesforce canvas app settings.
     */
    abstract void setCanvasUrlPath(String newPath);

    virtual String toString();
}