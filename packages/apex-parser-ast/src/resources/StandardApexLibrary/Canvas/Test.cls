/**
 * Contains methods for automated testing of your Canvas classes.
 * <p>Usage
 * Use this class to test your implementation of Canvas.CanvasLifecycleHandler with mock test data. You can create a test Canvas.RenderContext with mock application and environment context data and use this data to verify that your CanvasLifecycleHandler is being invoked correctly.
 */
global class Test {
    global final static String KEY_CANVAS_URL;
    global final static String KEY_DEVELOPER_NAME;
    global final static String KEY_DISPLAY_LOCATION;
    global final static String KEY_LOCATION_URL;
    global final static String KEY_NAME;
    global final static String KEY_NAMESPACE;
    global final static String KEY_SUB_LOCATION;
    global final static String KEY_VERSION;

    global Test() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Creates and returns a test Canvas.RenderContext based on the provided application and environment context parameters.
     * <p>Usage
     * Use this method to create a mock Canvas.RenderContext. Use the returned RenderContext in calls to Canvas.Test.testCanvasLifecycle(lifecycleHandler, mockRenderContext) for testing Canvas.CanvasLifecycleHandler implementations.
     * <p>Example
     * The following example creates maps to represent mock application and environment context data and generates a test Canvas.RenderContext. This test RenderContext can be used in a call to Canvas.Test.testCanvasLifecycle(lifecycleHandler, mockRenderContext).
     * Map<String,String> appValues = new Map<String,String>();
     * appValues.put(Canvas.Test.KEY_NAMESPACE,'alternateNamespace');
     * appValues.put(Canvas.Test.KEY_VERSION,'3.0');
     *
     * Map<String,String> envValues = new Map<String,String>();
     * envValues.put(Canvas.Test.KEY_DISPLAY_LOCATION,'Chatter');
     * envValues.put(Canvas.Test.KEY_LOCATION_URL,'https://MyDomainName.my.salesforce.com/_ui/core/chatter/ui/ChatterPage');
     *
     * Canvas.RenderContext mock = Canvas.Test.mockRenderContext(appValues,envValues);
     */
    global static Canvas.RenderContext mockRenderContext(Map appContextTestValues, Map envContextTestValues) { return null; }

    /**
     * Calls the Canvas test framework to invoke a CanvasLifecycleHandler with the provided RenderContext.
     * <p>Usage
     * Use this method to invoke an implementation of Canvas.CanvasLifecycleHandler.onRender(renderContext) with a mock Canvas.RenderContext that you provide.
     * <p>Example
     * The following example creates an Apex test class that uses maps to represent mock application and environment context data. The mock RenderContext object is then used to invoke a CanvasLifecycleHandler object. In this example, the CanvasLifecycleHandler is defined as MyCanvasListener, which is example implementation provided in Canvas.RenderContext.
     * @IsTest
     * global class CanvasRendercontextTest {
     *     @IsTest
     *     static void testRenderContext(){
     *         // Set some application context data in a Map
     *         Map<String,String> appValues = new Map<String,String>();
     *         appValues.put(Canvas.Test.KEY_NAMESPACE,'alternateNamespace');
     *         appValues.put(Canvas.Test.KEY_VERSION,'3.0');
     *
     *         // Set some environment context data in a MAp
     *         Map<String,String> envValues = new Map<String,String>();
     *         envValues.put(Canvas.Test.KEY_DISPLAY_LOCATION,'Chatter');
     *         envValues.put(Canvas.Test.KEY_LOCATION_URL,'https://MyDomainName.my.salesforce.com/_ui/core/chatter/ui/ChatterPage');
     *
     *         // Create a mock RenderContext using the test application and environment context data Maps
     *         Canvas.RenderContext mock = Canvas.Test.mockRenderContext(appValues,envValues);
     *
     *         // Set some custom params on the mock RenderContext
     *         mock.getEnvironmentContext().setParametersAsJSON('{"param1":1,"boolParam":true,"stringParam":"test string"}');
     *
     *         // Create a CanvasLifecycleHandler
     *         MyCanvasListener handler = new MyCanvasListener();
     *
     *         // Use the mock RenderContext to invoke the CanvasLifecycleHandler
     *         Canvas.Test.testCanvasLifecycle(handler,mock);
     * 	}
     * }
     */
    global static void testCanvasLifecycle(Canvas.CanvasLifecycleHandler handler, Canvas.RenderContext mockRenderContext) { }

    global override virtual String toString() { return null; }
}