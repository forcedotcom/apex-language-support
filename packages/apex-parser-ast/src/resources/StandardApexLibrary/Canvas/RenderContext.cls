/**
 * A wrapper interface that is used to retrieve application and environment context information.
 * <p>Usage
 * Use this interface to retrieve application and environment context information for your canvas app. For this interface, you don’t need to create an implementation. Use the default implementation that Salesforce provides.
 */
global interface RenderContext {
    virtual Boolean equals(Object arg0);

    /**
     * Retrieves the application context information.
     * <p>Usage
     * Use this method to get the application context information for your canvas app.
     * <p>Example
     * The following example implementation of the CanvasLifecycleHandler onRender() method uses the provided RenderContext to retrieve the application context information and then checks the namespace, version, and app URL.
     * public void onRender(Canvas.RenderContext renderContext){
     *     Canvas.ApplicationContext app = renderContext.getApplicationContext();
     *     if (!'MyNamespace'.equals(app.getNamespace())){
     *         // This application is installed, add code as needed
     *         ...
     *     }
     *
     *     // Check the application version
     *     Double currentVersion = Double.valueOf(app.getVersion());
     *
     *     if (currentVersion <= 5){
     *         // Add version specific code as needed
     *         ...
     *         // Tell the canvas application to operate in deprecated mode
     *         app.setCanvasUrlPath('/canvas?deprecated=true');
     *     }
     * }
     */
    abstract Canvas.ApplicationContext getApplicationContext();

    /**
     * Retrieves the environment context information.
     * <p>Usage
     * Use this method to get the environment context information for your canvas app.
     * <p>Example
     * The following example implementation of the CanvasLifecycleHandler onRender() method uses the provided RenderContext to retrieve the environment context information and then modifies the custom parameters.
     * public void onRender(Canvas.RenderContext renderContext) {
     *    Canvas.EnvironmentContext env =
     *         renderContext.getEnvironmentContext();
     *
     *     // Retrieve the custom params
     *     Map<String, Object> previousParams = (Map<String, Object>)
     *           JSON.deserializeUntyped(env.getParametersAsJSON());
     *
     *     previousParams.put('param1',1);
     *     previousParams.put('param2',3.14159);
     *
     *     ...
     *
     *     // Now, add in some opportunity record IDs
     *     Opportunity[] o = [select id, name from opportunity];
     *     previousParams.put('opportunities',o);
     *
     *     // Now, replace the parameters
     *     env.setParametersAsJSON(JSON.serialize(previousParams));
     * }
     */
    abstract Canvas.EnvironmentContext getEnvironmentContext();

    virtual Integer hashCode();

    virtual String toString();
}