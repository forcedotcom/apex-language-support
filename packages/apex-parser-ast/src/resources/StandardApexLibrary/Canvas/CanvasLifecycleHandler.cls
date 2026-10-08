/**
 * Implement this interface to control context information and add custom behavior during the application render phase.
 * Usage
 * Use this interface to specify what canvas context information is provided to your app by implementing the excludeContextTypes() method. Use this interface to call custom code when the app is rendered by implementing the onRender() method.
 * If you provide an implementation of this interface, you must implement excludeContextTypes() and onRender().
 * Example Implementation
 * The following example shows a simple implementation of CanvasLifecycleHandler that specifies that organization context information will be excluded and prints a debug message when the app is rendered.
 * public class MyCanvasListener
 * implements Canvas.CanvasLifecycleHandler{
 *     public Set<Canvas.ContextTypeEnum> excludeContextTypes(){
 *         Set<Canvas.ContextTypeEnum> excluded = new Set<Canvas.ContextTypeEnum>();
 *         excluded.add(Canvas.ContextTypeEnum.ORGANIZATION);
 *         return excluded;
 *     }
 *
 *     public void onRender(Canvas.RenderContext renderContext){
 *         System.debug('Canvas lifecycle called.');
 *     }
 * }
 */
global interface CanvasLifecycleHandler {
    virtual Boolean equals(Object arg0);

    /**
     * Lets the implementation exclude parts of the CanvasRequest context, if the application does not need it.
     * Usage
     * Implement this method to specify which attributes to disable in the context of the canvas app. A disabled attribute will set the associated canvas context information to null.
     * Disabling attributes can help improve performance by reducing the size of the signed request and canvas context. Also, disabled attributes do not need to be retrieved by Salesforce, which further improves performance.
     * See the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.platform_connect.meta/platform_connect/" target="_blank" title="HTML (New Window)">Canvas Developer Guide</a> for more information on context information in the Context object that’s provided in the CanvasRequest.
     * Example
     * This example implementation specifies that the organization information will be disabled in the canvas context.
     * public Set<Canvas.ContextTypeEnum> excludeContextTypes() {
     *     Set<Canvas.ContextTypeEnum> excluded = new Set<Canvas.ContextTypeEnum>();
     *     excluded.add(Canvas.ContextTypeEnum.ORGANIZATION);
     *     return excluded;
     * }
     * @return This method must return null or a set of zero or more ContextTypeEnum values. Returning null enables all attributes by default. ContextTypeEnum values that can be set are:
     * Canvas.ContextTypeEnum.ORGANIZATION
     * Canvas.ContextTypeEnum.RECORD_DETAIL
     * Canvas.ContextTypeEnum.USER
     * See ContextTypeEnum for more details on these values.
     */
    abstract Set excludeContextTypes();

    virtual Integer hashCode();

    /**
     * Invoked when a canvas app is rendered. Provides the ability to set and retrieve canvas application and environment context information during the application render phase.
     * Usage
     * If implemented, this method is called whenever the canvas app is rendered. The implementation can set and retrieve context information by using the provided Canvas.RenderContext.
     * This method is called whenever signed request or context information is retrieved by the client. See the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.platform_connect.meta/platform_connect/" target="_blank" title="HTML (New Window)">Canvas Developer Guide</a> for more information on signed request authentication.
     * Example
     * This example implementation prints ‘Canvas lifecycle called.’ to the debug log when the canvas app is rendered.
     * public void onRender(Canvas.RenderContext renderContext) {
     *     System.debug('Canvas lifecycle called.');
     * }
     */
    abstract void onRender(Canvas.RenderContext renderContext);

    virtual String toString();
}